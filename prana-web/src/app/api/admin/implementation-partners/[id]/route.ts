import { NextRequest, NextResponse } from "next/server";
import {
  getImplementationPartner,
  updateImplementationPartner,
  deleteImplementationPartner,
} from "@/actions/implementation-partners.actions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<any> }
) {
  try {
    const { id } = await params;
    const response = await getImplementationPartner(id);
    return NextResponse.json(response, { status: response.success ? 200 : 404 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<any> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const response = await updateImplementationPartner(id, body);
    return NextResponse.json(response, { status: response.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<any> }
) {
  try {
    const { id } = await params;
    const response = await deleteImplementationPartner(id);
    return NextResponse.json(response, { status: response.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
