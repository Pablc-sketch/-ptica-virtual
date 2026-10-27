"use client";

import { Component, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, useGLTF } from "@react-three/drei";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

class Boundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Viewer3D({ url, onError }: { url: string; onError: () => void }) {
  return (
    <Boundary onError={onError}>
      <Canvas frameloop="demand" camera={{ position: [0, 0, 3], fov: 40 }} dpr={[1, 1.5]} onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", onError);
      }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 4, 5]} intensity={1.6} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.3}>
            <Model url={url} />
          </Bounds>
        </Suspense>
        <OrbitControls enablePan={false} makeDefault />
      </Canvas>
    </Boundary>
  );
}
