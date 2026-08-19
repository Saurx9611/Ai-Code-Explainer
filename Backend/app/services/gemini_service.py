import os
import json
from google import genai
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List

# 1. Define the expected JSON structure
class SecurityIssue(BaseModel):
    line_start: int = Field(description="Starting line number")
    line_end: int = Field(description="Ending line number")
    severity: str = Field(description="HIGH, MEDIUM, or LOW")
    category: str = Field(description="Security, Performance, or Anti-pattern")
    description: str = Field(description="Detailed explanation")
    recommendation: str = Field(description="Fix recommendation")

class CodeAnalysisResponse(BaseModel):
    summary: str
    time_complexity: str
    space_complexity: str
    refactored_code: str
    issues: List[SecurityIssue]

load_dotenv()

# 2. Initialize the client using the exported setup
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is missing. Check your .env file in the Backend directory.")

client = genai.Client(api_key=api_key)

# 3. Use the exported generation config
generation_config = {
    'temperature': 0.1,
    'max_output_tokens': 65536,
    'top_p': 0.95,
    'thinking_level': 'high',
}

async def analyze_code_snippet(code: str, language: str) -> dict:
    prompt = f"Analyze this {language} code:\n\n{code}"
    
    # 4. Execute the interaction call using your exported AI Studio settings
    interaction = client.interactions.create(
        model='gemini-3.6-flash',
        input=prompt,
        system_instruction='You are an elite software architect and security auditor specializing in high-performance systems and algorithmic efficiency. Your task is to analyze raw code snippets, explain their fundamental logic, calculate precise Big-O complexities, and identify security vulnerabilities, memory leaks, or performance anti-patterns.\n\nRules:\n\n1. Always evaluate Time and Space complexity accurately.\n\n2. When identifying issues, provide the exact line numbers where the anti-pattern or vulnerability starts and ends.\n\n3. Provide a fully refactored, idiomatic, and highly optimized version of the code that resolves the identified issues.\n\n4. You must output exclusively in the provided JSON schema format. Do not include markdown formatting or conversational filler outside of the JSON structure.',
        generation_config=generation_config,
        response_format={
            "type": "text",
            "mime_type": "application/json",
            "schema": CodeAnalysisResponse.model_json_schema()
        }
    )
    
    # 5. Parse the guaranteed JSON text into a Python dictionary
    return json.loads(interaction.output_text)