from pydantic import BaseModel, Field
from typing import List, Optional

class SecurityIssue(BaseModel):
    line_start: int = Field(description="Starting line number of the issue")
    line_end: int = Field(description="Ending line number of the issue")
    severity: str = Field(description="HIGH, MEDIUM, or LOW")
    category: str = Field(description="Security, Performance, or Anti-pattern")
    description: str = Field(description="Detailed explanation of the flaw")
    recommendation: str = Field(description="Fix recommendation")

class CodeAnalysisResponse(BaseModel):
    summary: str = Field(description="Concise overview of what the code does")
    time_complexity: str = Field(description="Big-O notation time complexity")
    space_complexity: str = Field(description="Big-O notation space complexity")
    refactored_code: str = Field(description="Clean, optimized, and secure refactored code")
    issues: List[SecurityIssue] = Field(description="List of detected anti-patterns or bugs")

class CodeAnalysisRequest(BaseModel):
    code: str
    language: str = "python"