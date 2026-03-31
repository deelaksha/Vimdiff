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
    const { type, language, originalText, modifiedText, context } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set in environment variables." }, { status: 401 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let prompt = "";
    if (type === "all") {
      prompt = `You are an expert coder. Your task is to intelligently merge the Original and Modified versions of the given code.
Language: ${language}

CRITICAL RULES FOR MERGING:
This is a NON-DESTRUCTIVE merge.
1. You MUST NOT delete or overwrite any logic, features, or content from the Original version.
2. If both Original and Modified versions have different changes, you MUST combine them. 
3. Include both changes safely integrated together so no functionality from either side is lost.
4. Ensure variables match conceptually and syntax is strictly correct.

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
1. You MUST NOT delete logic, features, or lines from the Original block.
2. If both Original and Modified blocks contain different logic, you MUST combine both of them together.
3. Include both changes safely so nothing from the Original version is overridden or lost.

Original block:
${originalText}

Modified block:
${modifiedText}

Return ONLY the plain text resolution for this specific block (without any markdown formatting or code blocks like \`\`\`python). It should flawlessly fit right into the provided context ensuring BOTH original and modified logic are integrated perfectly. Do not wrap code in backticks.`;
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
