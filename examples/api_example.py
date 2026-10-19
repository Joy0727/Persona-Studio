"""Send one small JSON test request using the same API adapter as Persona Studio."""
from pathlib import Path
import json
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from ai_api import complete_json, settings

if __name__=='__main__':
    schema={'type':'object','properties':{'message':{'type':'string'}},'required':['message'],'additionalProperties':False}
    try:
        result=complete_json('Return JSON with message set to "Persona Studio API connected".',schema,settings())
        if not isinstance(result.get('message'),str):raise ValueError('Expected a message string. Check JSON output compatibility.')
        print(json.dumps(result,ensure_ascii=False,indent=2))
    except ValueError as error:
        print(str(error),file=sys.stderr)
        sys.exit(1)
