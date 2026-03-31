import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { language, content } = await req.json();

    if (!content || !language) {
      return NextResponse.json({ error: "Missing language or content" }, { status: 400 });
    }

    if (language === "python") {
      const tempFile = path.join(os.tmpdir(), `val_${Date.now()}.py`);
      await fs.writeFile(tempFile, content, "utf8");
      
      try {
        await execAsync(`python -c "import ast; ast.parse(open(r'${tempFile}', encoding='utf-8').read())"`);
        await fs.unlink(tempFile).catch(() => {});
        return NextResponse.json({ valid: true });
      } catch (error: any) {
        await fs.unlink(tempFile).catch(() => {});
        return NextResponse.json({ 
            valid: false, 
            error: error.stderr || error.message || "Unknown syntax error" 
        }, { status: 422 });
      }
    }

    if (language === "go") {
       const tempFile = path.join(os.tmpdir(), `val_${Date.now()}.go`);
       await fs.writeFile(tempFile, content, "utf8");
       try {
         // Using gofmt -e to strictly parse and report errors without rewriting
         await execAsync(`gofmt -e "${tempFile}"`);
         await fs.unlink(tempFile).catch(() => {});
         return NextResponse.json({ valid: true });
       } catch (error: any) {
         await fs.unlink(tempFile).catch(() => {});
         return NextResponse.json({ 
            valid: false, 
            error: error.stderr || error.message || "Unknown Go syntax error" 
         }, { status: 422 });
       }
    }

    return NextResponse.json({ error: "Unsupported backend language for validation" }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: "Validation request failed: " + err.message }, { status: 500 });
  }
}
