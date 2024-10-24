import { useEffect, useState, useRef } from "react";
import useASCII3DRenderer from "../src/engines/renderer";
import "./App.scss";

//http://www.mathforengineers.com/math-calculators/3D-point-rotation-calculator.html 여기서 결과비교
// TODO: 회전변환 완료 된 점을 그리는 rasterizing 함수 구현하기
function App() {
  const { frameBuffer, convertFrameBufferToString } = useASCII3DRenderer(120, 50);

  const renderWindowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (renderWindowRef.current) {
      renderWindowRef.current.innerHTML = convertFrameBufferToString();
    }
  }, [frameBuffer]);
  
  return (
    <>
      <div className="window" ref={renderWindowRef}></div>
    </>
  );
}

export default App;
