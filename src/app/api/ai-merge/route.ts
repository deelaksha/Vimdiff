import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { type, language, originalText, modifiedText, context, userInstruction, currentMergedText } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set in environment variables." }, { status: 401 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let prompt = "";
    if (currentMergedText && userInstruction && userInstruction.trim() !== "") {
        prompt = `You are an expert coder. The user has provided feedback on a code merge.
Language: ${language}

Here is the Original Production Code:
${originalText}

Here is the Modified Code:
${modifiedText}

Here is the CURRENT MERGED output you (or the user) previously generated:
${currentMergedText}

USER INSTRUCTION TO MODIFY THE CURRENT MERGED OUTPUT:
${userInstruction}

CRITICAL RULES:
1. Your absolute primary source code to edit is the CURRENT MERGED output provided above.
2. You must apply the User Instruction to tweak this CURRENT MERGED output exactly as requested.
3. NEVER start from scratch. Do not write a new merge based on Original/Modified unless implicitly requested by the instruction.
4. Return ONLY the fully updated plain text resolution (without markdown formatting or codeblocks like \`\`\`python). Do not wrap code in backticks.`;
    } else {
        if (type === "all") {
          prompt = `You are an expert coder. Your task is to intelligently merge the Original and Modified versions of the given code.
Language: ${language}

CRITICAL RULES FOR MERGING:
This is a STRICTLY APPEND-ONLY NON-DESTRUCTIVE merge.
1. The Original text is production code. You MUST output the EXACT Original text as it is without modifying or removing a single character.
2. The Modified text contains new logic. You must APPEND or PREPEND the new components from the Modified code around the Original code, ensuring they exist alongside each other.
3. Priority MUST be given to the Original code. It must stay exactly as it is.
4. Do NOT replace Original code with Modified code.

Please return ONLY the fully merged, functional code. Do NOT include any markdown formatting, backticks, or codeblock tags like \`\`\`python. Just return the raw code string immediately.

--- ORIGINAL ---
${originalText}

--- MODIFIED ---
${modifiedText}
`;
        } else {
          prompt = `You are an expert coder. Resolve this specific code conflict intelligently.
Language: ${language}
Context around the conflict: 
${context}

CRITICAL RULES FOR NON-DESTRUCTIVE MERGE:
1. The Original block is production code. You MUST include the EXACT Original block in your output without deleting or altering a single character.
2. Priority MUST be given to the Original block.
3. You must APPEND the new differences from the Modified block after (or before) the Original block. 
4. DO NOT replace Original code with Modified code. Concatenate them logically.

Original block:
${originalText}

Modified block:
${modifiedText}

Return ONLY the plain text resolution for this specific block (without any markdown formatting or code blocks like \`\`\`python). It should flawlessly fit right into the provided context ensuring BOTH original and modified logic are integrated perfectly as an append. Do not wrap code in backticks.`;
        }
        
        if (userInstruction && userInstruction.trim() !== "") {
            prompt += `\n\n--- SPECIFIC USER INSTRUCTION ---\n${userInstruction}\n\nYou MUST prioritize and follow this custom user instruction explicitly. It overrides general merge rules if there is a conflict.`;
        }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });

    let resultText = response.text || "";
    // strip markdown codeblocks if AI happens to add them
    if (resultText.startsWith("\`\`\`")) {
      resultText = resultText.replace(/^\`\`\`[a-z]*\n/, '').replace(/\n\`\`\`$/g, '');
    }

    // Strict validation for specific languages on 'all' merge
    if (type === "all" && ["python", "go"].includes(language)) {
      const isValid = await validateSyntax(language, resultText);
      if (!isValid.valid) {
        return NextResponse.json({
          error: (isValid.error || "Syntax check failed after AI merge.") + " - AI produced structurally invalid code or variable mismatch.",
          proposed: resultText
        }, { status: 422 });
      }
    }

    return NextResponse.json({ success: true, mergedContent: resultText });

  } catch (err: any) {
    return NextResponse.json({ error: "AI Merge request failed: " + err.message }, { status: 500 });
  }
}

async function validateSyntax(language: string, content: string) {
  if (language === "python") {
    const tempFile = path.join(os.tmpdir(), `val_ai_${Date.now()}.py`);
    await fs.writeFile(tempFile, content, "utf8");
    try {
      await execAsync(`python -c "import ast; ast.parse(open(r'${tempFile}', encoding='utf-8').read())"`);
      await fs.unlink(tempFile).catch(() => { });
      return { valid: true };
    } catch (error: any) {
      await fs.unlink(tempFile).catch(() => { });
      return { valid: false, error: error.stderr || error.message || "Unknown syntax error" };
    }
  }

  if (language === "go") {
    const tempFile = path.join(os.tmpdir(), `val_ai_${Date.now()}.go`);
    await fs.writeFile(tempFile, content, "utf8");
    try {
      await execAsync(`gofmt -e "${tempFile}"`);
      await fs.unlink(tempFile).catch(() => { });
      return { valid: true };
    } catch (error: any) {
      await fs.unlink(tempFile).catch(() => { });
      return { valid: false, error: error.stderr || error.message || "Unknown Go syntax error" };
    }
  }
  return { valid: true };
}
