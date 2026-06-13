import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { tool_name, payload } = await req.json();

    if (tool_name === "navigate") {
      const page = payload.page || "dashboard";
      const route = `/${page === "dashboard" ? "" : page}`;
      return NextResponse.json({ success: true, message: `Navigating to ${page}...`, route });
    }

    if (tool_name === "execute_prisma_operation") {
      const { model, operation, args } = payload;
      
      if (!model || !operation) {
        return NextResponse.json({ success: false, error: "Missing model or operation" }, { status: 400 });
      }

      // Safe evaluation of the prisma call
      const prismaModel = (prisma as any)[model];
      if (!prismaModel || typeof prismaModel[operation] !== "function") {
        return NextResponse.json({ success: false, error: `Invalid Prisma operation: prisma.${model}.${operation}` }, { status: 400 });
      }

      let parsedArgs = {};
      if (args) {
        if (typeof args === "string") {
          try {
            // Strip markdown formatting if AI added it
            let cleanArgs = args.trim().replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/, "").trim();
            parsedArgs = JSON.parse(cleanArgs);
          } catch (e) {
            try {
              // Fallback for malformed JSON (e.g. single quotes, unquoted keys)
              let cleanArgs = args.trim().replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/, "").trim();
              parsedArgs = new Function("return " + cleanArgs)();
            } catch (fallbackError) {
              return NextResponse.json({ success: false, error: "Invalid JSON args" }, { status: 400 });
            }
          }
        } else if (typeof args === "object") {
          parsedArgs = args;
        }
      }

      try {
        const result = await prismaModel[operation](parsedArgs);
        
        return NextResponse.json({ 
          success: true, 
          message: `Successfully executed prisma.${model}.${operation}`,
          data: result
        });
      } catch (prismaError: any) {
        return NextResponse.json({ 
          success: false, 
          error: `Prisma error: ${prismaError.message?.slice(0, 300)}`
        }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, error: "Unknown tool call" }, { status: 400 });

  } catch (error: any) {
    console.error("AI Tool Execution Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute tool" },
      { status: 500 }
    );
  }
}
