from fastapi import APIRouter, HTTPException
from app.schemas.analysis import CodeAnalysisRequest, CodeAnalysisResponse
from app.services.gemini_service import analyze_code_snippet

router = APIRouter(prefix="/api", tags=["Analysis"])

@router.post("/analyze", response_model=CodeAnalysisResponse)
async def analyze_endpoint(payload: CodeAnalysisRequest):
    if not payload.code.strip():
        raise HTTPException(status_code=400, detail="Code snippet cannot be empty.")
    try:
        return await analyze_code_snippet(payload.code, payload.language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))