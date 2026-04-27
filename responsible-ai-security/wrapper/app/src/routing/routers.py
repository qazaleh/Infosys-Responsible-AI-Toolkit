'''
MIT license https://opensource.org/licenses/MIT
Copyright 2024-2025 Infosys Ltd.
 
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
'''

import datetime
from fastapi import Depends,APIRouter,Query, Body,Form,HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from src.mappers.mappers import GetAttackDataRequest
from src.service.service import Infosys, Bulk
from src.service.utility import Utility as UT
from src.config.logger import CustomLogger
from typing import Dict, Optional
import os
import gc

tool = APIRouter()
logs = APIRouter()
attack = APIRouter()
bulk = APIRouter()
log = CustomLogger()

@attack.post('/rai/v1/security_workbench/attack')
async def get_attacks(TargetClassifier:str=Form(),TargetDataType:str=Form()):
    try:
        # payload = {'targetClassifier': target_classifier, 'targetDataType': target_data_type}
        payload = {'targetClassifier': TargetClassifier, 'targetDataType': TargetDataType}
        response = Infosys.getAttackFuncs(payload)
        gc.collect()
        return response
    except Exception as e:
        log.error(f"Error in get_attacks: {str(e)}")
        gc.collect()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@attack.post('/rai/v1/security_workbench/addattack')
async def add_Attack(Payload: GetAttackDataRequest):
    try:
        response = Infosys.addAttack(Payload)
        gc.collect()
        return response
    except Exception as e:
        log.error(f"Error in add_Attack: {str(e)}")
        gc.collect()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@attack.delete('/rai/v1/security_workbench/deleteattack')
async def delete_Attack(AttacFunc: str):
    try:
        payload = {'attackName': AttacFunc}
        response = Infosys.deleteAttack(payload)
        gc.collect()
        return response
    except Exception as e:
        log.error(f"Error in delete_Attack: {str(e)}")
        gc.collect()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
 
@bulk.post('/rai/v1/security_workbench/runallattacks')
# async def run_all_attacks(batchId: float = Form(...), dateTime: Optional[datetime.datetime] = Form(None, description = "{dateTime=datetime.datetime.now()}")):
async def run_all_attacks(batchId: float = Form(...), dateTime: Optional[datetime.datetime] = Form(None)):
    try:
        print(UT.dateTimeFormat(dateTime))
        # payload = {'batchid': batchId}
        payload = {'batchid': batchId, 'dateTime':UT.dateTimeFormat(dateTime)}
        response = Bulk.runAllAttack(payload)
        if isinstance(response, (int, float)):
            gc.collect()
            return {'BatchId': response}

        failure_detail = response.get('runAllAttack') if isinstance(response, dict) else str(response)
        gc.collect()
        raise HTTPException(status_code=500, detail=failure_detail or 'Internal security robustness run failed.')
    except Exception as e:
        log.error(f"Error in run_all_attacks: {str(e)}")
        gc.collect()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@bulk.post('/rai/v1/security_workbench/validateattackrun')
async def validate_attack_run(batchId: float = Form(...)):
    try:
        response = Bulk.validateAttackRunPreconditions({'batchid': batchId})
        gc.collect()
        if response.get('status') == 'SUCCESS':
            return response
        raise HTTPException(status_code=422, detail=response.get('message') or 'Robustness compatibility validation failed.')
    except Exception as e:
        log.error(f"Error in validate_attack_run: {str(e)}")
        gc.collect()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# TEMP DEBUG ENDPOINT: View generated reports
@bulk.get('/rai/v1/security_workbench/temp_reports')
async def list_temp_reports():
    """List all temporary reports generated for debugging"""
    try:
        temp_reports_path = UT.getcurrentDirectory() + "/temp_reports"
        if not os.path.exists(temp_reports_path):
            return {"message": "No temp reports yet", "path": temp_reports_path}
        
        reports = os.listdir(temp_reports_path)
        report_details = []
        for report in reports:
            report_path = os.path.join(temp_reports_path, report)
            if os.path.isdir(report_path):
                files = os.listdir(report_path)
                report_details.append({
                    "name": report,
                    "files": files,
                    "html_url": f"/rai/v1/security_workbench/temp_reports/{report}/"
                })
        
        return {"temp_reports_path": temp_reports_path, "reports": report_details}
    except Exception as e:
        log.error(f"Error in list_temp_reports: {str(e)}")
        return {"error": str(e)}

@bulk.get('/rai/v1/security_workbench/temp_reports/{report_name}/')
async def get_temp_report_html(report_name: str):
    """Get the HTML report file"""
    try:
        temp_reports_path = UT.getcurrentDirectory() + "/temp_reports"
        report_path = os.path.join(temp_reports_path, report_name, "report.html")
        
        if not os.path.exists(report_path):
            raise HTTPException(status_code=404, detail=f"Report not found: {report_path}")
        
        with open(report_path, 'r') as f:
            html_content = f.read()
        
        return HTMLResponse(content=html_content)
    except Exception as e:
        log.error(f"Error in get_temp_report_html: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error reading report: {str(e)}")
