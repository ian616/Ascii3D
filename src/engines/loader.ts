import { useEffect } from "react";
import type { Polygon } from "../model/polygon";

import { create, all, Matrix } from "mathjs";

export default function useLoader() {
  const math = create(all);

  const parseObjtoPolygons = async () => {
    const ObjString: string = await readModelfromFile("cube");

    const vertices: Matrix[] = [];
    const polygons: Polygon[] = [];

    ObjString.split("\n").forEach((row) => {
      const datas: string[] = row.split(" ");

      if (datas[0] === "v") {
        vertices.push(math.matrix([datas[1], datas[2], datas[3]]));
      } else if (datas[0] === "f") {
        const polygon: Polygon = {
          vertices: [
            vertices[parseInt(datas[1]) - 1],
            vertices[parseInt(datas[2]) - 1],
            vertices[parseInt(datas[3]) - 1],
          ],
        };
        polygons.push(polygon);
      }
    });
  };

  const readModelfromFile = async (modelName: string) => {
    const response = await fetch(`/objects/${modelName}.ts`);
    const fileContent: string = await response.text();
    return fileContent;
  };

  return { parseObjtoPolygons };
}
