from flask import Flask ,send_from_directory ,request ,make_response
from flask_cors import CORS
import os
from dotenv import load_dotenv

"""App entrypoint.

IMPORTANT: load_dotenv MUST run before importing any modules that read env vars at import time.
Previously, blueprints were imported before calling load_dotenv(), causing services like
GeminiService (instantiated at module import) to miss variables defined only in the .env file.
This resulted in missing/invalid API key issues. We now load .env first, then import blueprints.
"""

load_dotenv ()

from routes .ai import ai_bp
from routes .data import data_bp

app =Flask (__name__ )

cors_origins_env =os .getenv ('CORS_ORIGINS','*')

default_origins ={'http://localhost:3000','http://localhost:3001','http://127.0.0.1:3000','http://127.0.0.1:3001','http://localhost:5173','http://localhost:5174','http://127.0.0.1:5173','http://127.0.0.1:5174'}
if cors_origins_env !='*':
    configured ={o .strip ()for o in cors_origins_env .split (',')if o .strip ()}
    cors_origins =list (default_origins .union (configured ))
else :
    cors_origins =list (default_origins )

CORS (app ,resources ={r"/api/*":{"origins":cors_origins }},supports_credentials =True )

@app .after_request
def add_cors_headers (response ):
    origin =request .headers .get ('Origin')
    if origin and (origin in cors_origins or '*'in cors_origins_env ):
        response .headers ['Access-Control-Allow-Origin']=origin
        response .headers ['Vary']='Origin'
        response .headers ['Access-Control-Allow-Credentials']='true'
        response .headers ['Access-Control-Allow-Headers']='Content-Type, Authorization'
        response .headers ['Access-Control-Allow-Methods']='GET, POST, PUT, DELETE, OPTIONS'
    return response

app .config ['MAX_CONTENT_LENGTH']=int (os .getenv ('MAX_CONTENT_LENGTH',52428800 ))

app .register_blueprint (ai_bp ,url_prefix ='/api/ai')
app .register_blueprint (data_bp ,url_prefix ='/api/data')

@app .route ('/')
def index ():
    return {
    'status':'Vocalis AI Backend Running',
    'version':'1.0.0',
    'endpoints':{
    'ai':'/api/ai',
    'data':'/api/data',
    'static':'/static'
    }
    }

@app .route ('/api/health')
def health ():
    return {'status':'healthy','timestamp':os .getenv ('TIMESTAMP','unknown')}

@app .route ('/static/<filename>')
def serve_static (filename ):
    """Serve static files (charts, audio)"""
    return send_from_directory ('static',filename )

if __name__ =='__main__':

    os .makedirs ('static',exist_ok =True )

    port =int (os .getenv ('PORT',5000 ))
    debug =os .getenv ('FLASK_DEBUG','False').lower ()=='true'

    app .run (host ='0.0.0.0',port =port ,debug =debug )
