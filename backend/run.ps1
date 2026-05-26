Param([int]$Port = 8000)
$ErrorActionPreference = "Stop"
if (-not (Test-Path .venv)) {
    py -3 -m venv .venv
}
. .\.venv\Scripts\Activate.ps1
pip install -q -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port $Port
