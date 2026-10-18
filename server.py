"""Standalone, platform-only Persona Studio server. No simulation-engine imports."""
from __future__ import annotations
import argparse
import json
import mimetypes
from pathlib import Path
import secrets
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import uuid
import webbrowser

ROOT = Path(__file__).resolve().parent
UI = ROOT / 'tools' / 'persona-studio'
sys.path.insert(0, str(ROOT / 'tools'))
from survey_text import extract_text, read_interview_document
from persona_batch import generate_batch
TOKEN = secrets.token_urlsafe(32)
STATIC = {'/': UI/'index.html', '/index.html': UI/'index.html',
          '/builder': ROOT/'tools/persona-builder.html',
          **{'/'+name: UI/name for name in ('studio.js','studio.css','roles.js','parameters.js')}}


def save_card(body):
    card, parameters, answers = (body.get(key) for key in ('card','parameters','answers'))
    if not all(isinstance(v, dict) for v in (card, parameters, answers)):
        raise ValueError('A card, parameters and source answers are required.')
    if card.get('format') != 'sue-persona' or card.get('version') != 2:
        raise ValueError('Expected a sue-persona v2 card.')
    if card.get('persona',{}).get('cardType') != 'normal':
        raise ValueError('Expected a normal persona card.')
    if any(not isinstance(card.get(key),list) or not card[key] for key in ('items','screens','steps')):
        raise ValueError('The card is incomplete.')
    for key in ('risk','patience','detailFind','detailCheck'):
        if card.get('tendency',{}).get(key,{}).get('level') not in ('low','medium','high'):
            raise ValueError('Invalid behavior level: '+key)
    identity = 'studio-'+uuid.uuid4().hex
    cards, records = ROOT/'data/personas', ROOT/'data/studio-configurations'
    cards.mkdir(parents=True,exist_ok=True); records.mkdir(parents=True,exist_ok=True)
    target, record = cards/(identity+'.json'), records/(identity+'.json')
    try:
        with target.open('x',encoding='utf-8') as f:
            json.dump(card,f,ensure_ascii=False,indent=2)
        with record.open('x',encoding='utf-8') as f:
            json.dump({'format':'sue-studio-record','version':1,'parameters':parameters,
                       'nativeAnswers':answers,'card':target.name,
                       'validation':'Structural checks only; external engine not included'},f,
                      ensure_ascii=False,indent=2)
    except Exception:
        target.unlink(missing_ok=True);record.unlink(missing_ok=True)
        raise
    return {'id':identity,'filename':target.name,'path':str(target)}


class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):
        pass

    def valid_host(self):
        return self.headers.get('Host') in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}')

    def send_json(self,body,status=200):
        data=json.dumps(body,ensure_ascii=False).encode('utf-8')
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)))
        self.end_headers();self.wfile.write(data)

    def do_GET(self):
        if not self.valid_host():
            self.send_json({'error':'Use the local studio address.'},403);return
        if self.path=='/api/status':
            self.send_json({'token':TOKEN,'ready':False,'activeJob':None,'checks':[{'ok':False,'label':'Engine deliberately excluded. Editing, AI generation and export are available.'}]});return
        path=STATIC.get(self.path)
        if path is None:
            self.send_json({'error':'Not found.'},404);return
        data=path.read_bytes()
        self.send_response(200);self.send_header('Content-Type',(mimetypes.guess_type(str(path))[0] or 'text/plain')+'; charset=utf-8')
        self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)))
        self.end_headers();self.wfile.write(data)

    def do_POST(self):
        if not self.valid_host() or self.headers.get('X-Studio-Token')!=TOKEN:
            self.send_json({'error':'Reload Persona Studio before saving.'},403);return
        origin=self.headers.get('Origin')
        if origin and origin not in (f'http://127.0.0.1:{self.server.server_port}', f'http://localhost:{self.server.server_port}'):
            self.send_json({'error':'Use the local studio page.'},403);return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=1000000:raise ValueError('Invalid request size.')
            body=json.loads(self.rfile.read(length))
            if not isinstance(body,dict):raise ValueError('Expected an object.')
            if self.path=='/api/save':result=save_card(body)
            elif self.path=='/api/extract-interview':result=extract_text(body.get('text'),UI/'.extraction-cache')
            elif self.path=='/api/read-interview':result=read_interview_document(body.get('document'))
            elif self.path=='/api/generate-batch':result=generate_batch(body,UI/'.extraction-cache')
            elif self.path=='/api/vocabulary-preview':raise ValueError('Engine-matched word preview requires the separately installed engine. Vocabulary settings are still saved and exported.')
            elif self.path in ('/api/run','/api/stop'):raise ValueError('The simulation engine is not included. Export a card and run it in your separate engine installation.')
            else:self.send_json({'error':'Unknown endpoint.'},404);return
            self.send_json(result)
        except (ValueError,KeyError,TypeError) as error:self.send_json({'error':str(error)},400)
        except OSError:self.send_json({'error':'Could not access local files or start Codex. Check your setup.'},500)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=8765)
    parser.add_argument('--no-open',action='store_true')
    args=parser.parse_args()
    try:server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    except OSError:
        if args.port!=8765:raise
        server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    url=f'http://127.0.0.1:{server.server_port}/'
    print('Persona Studio (platform only): '+url,flush=True)
    if not args.no_open:webbrowser.open(url)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':main()
