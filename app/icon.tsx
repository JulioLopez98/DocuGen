import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 512,
  height: 512,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2d6a4f",
          color: "#faf9f6",
          fontFamily: "Georgia, serif",
          fontSize: 168,
          fontWeight: 700,
        }}
      >
        DG
      </div>
    ),
    size,
  );
}
