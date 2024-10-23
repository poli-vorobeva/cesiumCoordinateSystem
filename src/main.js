import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";

let model = null;
// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

const HEIGHT = 3000;
let primitive = null;
const data = [];
const worldTileset = await Cesium.createGooglePhotorealistic3DTileset();
viewer.scene.primitives.add(worldTileset);

const buildingTileset = await Cesium.createOsmBuildingsAsync();
viewer.scene.primitives.add(buildingTileset);

const lon = 37.631099;
const lat = 55.753428;
const center = Cesium.Cartesian3.fromDegrees(lon, lat, HEIGHT);
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
const draw = () => {
  drawScene();
  clickHandler();
};

async function drawScene() {
  const radius = 30;
  const len = 40;
  const modelTileset = await drawModel(
    center,
    "https://13b6c13d-76cc-414e-8b1d-2e11d3396303.selstorage.ru/tileset(X-90)Y_Up.json",
  );
  model = modelTileset;
  const getSurfaceNormal = () => {
    const surfaceNormal = new Cesium.Cartesian3();
    Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(center, surfaceNormal);
    return surfaceNormal;
  };
  //z
  const surfaceNormal = getSurfaceNormal();
  const zAxisDirection = Cesium.Cartesian3.multiplyByScalar(
    surfaceNormal,
    len,
    new Cesium.Cartesian3(),
  );
  const radiusOffset = modelTileset.boundingSphere.radius;

  const zAxisDerectionOffset = Cesium.Cartesian3.multiplyByScalar(
    surfaceNormal,
    radiusOffset,
    new Cesium.Cartesian3(),
  );
  const coordSystemCenter = Cesium.Cartesian3.add(
    center,
    zAxisDerectionOffset,
    new Cesium.Cartesian3(),
  );
  //сфера примитив
  var sphere = drawSphere(radius, coordSystemCenter);

  viewer.scene.primitives.add(sphere);
  data.push(sphere);

  //x
  const arbitrarVector = Cesium.Cartesian3.UNIT_X;
  const xAxisDirection = Cesium.Cartesian3.cross(
    arbitrarVector,
    zAxisDirection,
    new Cesium.Cartesian3(),
  );
  Cesium.Cartesian3.normalize(xAxisDirection, xAxisDirection);
  Cesium.Cartesian3.multiplyByScalar(xAxisDirection, -len, xAxisDirection);

  //y
  const yAxisDirection = Cesium.Cartesian3.cross(
    zAxisDirection,
    xAxisDirection,
    new Cesium.Cartesian3(),
  );
  Cesium.Cartesian3.normalize(yAxisDirection, yAxisDirection);
  Cesium.Cartesian3.multiplyByScalar(yAxisDirection, -len, yAxisDirection);

  //оси xyz

  const xAxis = addAxis(len, coordSystemCenter, xAxisDirection, "RED", "X");
  const yAxis = addAxis(len, coordSystemCenter, yAxisDirection, "GREEN", "Y");
  const zAxis = addAxis(len, coordSystemCenter, zAxisDirection, "PINK", "Z");
  data.push(zAxis);
  //полукруг

  const an = -Math.PI / 20;
  const positions = [];
  const cartographic = Cesium.Cartographic.fromCartesian(coordSystemCenter);

  const adjustedPosition = Cesium.Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    cartographic.height,
  );

  const originalMatrix =
    Cesium.Transforms.eastNorthUpToFixedFrame(adjustedPosition);

  for (let i = 0; i <= 20; i++) {
    const ang = an * i;
    const x = radius * Math.cos(ang);
    const y = radius * Math.sin(ang);
    positions.push(new Cesium.Cartesian3(x, y, 0));
  }

  function computeCircle(radius) {
    const positions = [];
    for (let i = 0; i < 360; i++) {
      const radians = Cesium.Math.toRadians(i);
      positions.push(
        new Cesium.Cartesian2(
          radius * Math.cos(radians),
          radius * Math.sin(radians),
        ),
      );
    }
    return positions;
  }
  // Создаем геометрию объема
  const polylineVolume = new Cesium.PolylineVolumeGeometry({
    polylinePositions: positions,
    shapePositions: computeCircle(0.8),
  });

  // Создаем экземпляр геометрии
  const geometryInstance = new Cesium.GeometryInstance({
    geometry: polylineVolume,
  });

  // Создаем примитив с материалом
  const halfCircle = new Cesium.Primitive({
    name: "R",
    geometryInstances: [geometryInstance],
    modelMatrix: originalMatrix,
    appearance: new Cesium.MaterialAppearance({
      material: new Cesium.Material({
        fabric: {
          type: "Color",
          uniforms: {
            color: Cesium.Color.LIGHTBLUE,
          },
        },
      }),
      renderState: {
        depthTest: {
          enabled: false,
        },
      },
    }),
  });
  halfCircle.name = "R";
  data.push(halfCircle);
  viewer.scene.primitives.add(halfCircle);
  viewer.zoomTo(viewer.entities);
}

const button = document.getElementById("draw");
button.addEventListener("click", draw);
let isDragging = false;

function cameraBlockBehavior(isNormalBehavior) {
  viewer.scene.screenSpaceCameraController.enableRotate = isNormalBehavior;
  viewer.scene.screenSpaceCameraController.enableTranslate = isNormalBehavior;
  viewer.scene.screenSpaceCameraController.enableZoom = isNormalBehavior;
}
function listenMoveStop(click) {
  console.log("Мышь ОТЖАТА");
  isDragging = false;
  handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
  clickHandler();
  cameraBlockBehavior(true);
}
function getCartesian3ByClick(matrix, click) {
  return Cesium.Matrix4.multiplyByPoint(
    matrix,
    new Cesium.Cartesian3(click.x, -click.y, 0),
    new Cesium.Cartesian3(),
  );
}
const moveElements = (click) => {
  const inverse = viewer.camera.inverseViewMatrix;
  if (click.startPosition.y === click.endPosition.y) return;

  const cartesianStart = getCartesian3ByClick(inverse, click.startPosition);
  const cartesian = getCartesian3ByClick(inverse, click.endPosition);
  const sub = Cesium.Cartesian3.subtract(
    cartesian,
    cartesianStart,
    new Cesium.Cartesian3(),
  );
  const axisVector = primitive.id?.properties.axis.getValue();
  const axisvectorMagnitude = Cesium.Cartesian3.magnitude(axisVector);
  let dot = Cesium.Cartesian3.dot(sub, axisVector);

  dot /= axisvectorMagnitude * axisvectorMagnitude; //высчитываем коэф шага движения !!!!

  const translation = Cesium.Cartesian3.multiplyByScalar(
    axisVector,
    dot,
    new Cesium.Cartesian3(),
  );

  const offsetWithoutCollect = Cesium.Matrix4.fromTranslation(translation);

  Cesium.Matrix4.multiply(
    offsetWithoutCollect,
    model.modelMatrix,
    model.modelMatrix,
  );
  Cesium.Matrix4.multiply(
    offsetWithoutCollect,
    primitive.primitive.modelMatrix,
    primitive.primitive.modelMatrix,
  );
  const halfCircle = data.find(isRotationActive);
  if (halfCircle) {
    Cesium.Matrix4.multiply(
      offsetWithoutCollect,
      halfCircle.modelMatrix,
      halfCircle.modelMatrix,
    );
  }

  const sphere = data.find((en) => en.name === "SPHERE");
  Cesium.Matrix4.multiply(
    offsetWithoutCollect,
    sphere.modelMatrix,
    sphere.modelMatrix,
  );

  if (isDragging) {
    cameraBlockBehavior(false);
  }
};

function rotateElements(click) {
  //поворот

  const centerModelMatrix = Cesium.Matrix4.getTranslation(
    primitive.primitive.modelMatrix,
    new Cesium.Cartesian3(),
  );
  const surfaceNormal = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(
    centerModelMatrix,
    new Cesium.Cartesian3(),
  );
  const angleR = getAngle(surfaceNormal, centerModelMatrix, click);

  const rotationMatrix4 = Cesium.Matrix4.fromRotationTranslation(
    Cesium.Matrix3.fromRotationZ(angleR),
  );

  Cesium.Matrix4.multiply(
    primitive.primitive.modelMatrix,
    rotationMatrix4,
    primitive.primitive.modelMatrix,
  );
  Cesium.Matrix4.multiply(
    model.modelMatrix,
    rotationMatrix4,
    model.modelMatrix,
  );
}

function listenMouseMove(click) {
  if (isRotationActive(primitive)) {
    rotateElements(click);
  } else {
    moveElements(click);
  }
  handler.setInputAction(listenMoveStop, Cesium.ScreenSpaceEventType.LEFT_UP);
}

function listenMouseDown(click) {
  const t = viewer.scene.drillPick(click.position).find(isCoordinateClick);
  if (t) {
    primitive = t;
    cameraBlockBehavior(false);
  } else {
    cameraBlockBehavior(true);
    return;
  }
  isDragging = true;
  handler.setInputAction(
    listenMouseMove,
    Cesium.ScreenSpaceEventType.MOUSE_MOVE,
  );
}
function clickHandler() {
  handler.setInputAction(
    listenMouseDown,
    Cesium.ScreenSpaceEventType.LEFT_DOWN,
  );
}

function getAngle(normal, center, click) {
  const distance = -Cesium.Cartesian3.dot(normal, center);

  const rayStart = viewer.camera.getPickRay(click.startPosition);
  const rayEnd = viewer.camera.getPickRay(click.endPosition);
  const negateNormal = Cesium.Cartesian3.negate(
    normal,
    new Cesium.Cartesian3(),
  );

  const inclineCameraStart = Cesium.Cartesian3.angleBetween(
    negateNormal,
    rayStart.direction,
  );
  const inclineCameraEnd = Cesium.Cartesian3.angleBetween(
    negateNormal,
    rayEnd.direction,
  );

  const distanceToPlane =
    Cesium.Cartesian3.dot(rayStart.origin, center) + distance;

  const lengthOffsetToStart = distanceToPlane / Math.cos(inclineCameraStart);
  const lengthOffsetToEnd = distanceToPlane / Math.cos(inclineCameraEnd);

  const offsetStartPosition = Cesium.Cartesian3.multiplyByScalar(
    rayStart.direction,
    lengthOffsetToStart,
    new Cesium.Cartesian3(),
  );
  const offsetEndPosition = Cesium.Cartesian3.multiplyByScalar(
    rayEnd.direction,
    lengthOffsetToEnd,
    new Cesium.Cartesian3(),
  );
  const projectionStartPosition = Cesium.Cartesian3.add(
    rayStart.origin,
    offsetStartPosition,
    new Cesium.Cartesian3(),
  );
  const projectionEndPosition = Cesium.Cartesian3.add(
    rayEnd.origin,
    offsetEndPosition,
    new Cesium.Cartesian3(),
  );

  const vecToStart = Cesium.Cartesian3.subtract(
    projectionStartPosition,
    center,
    new Cesium.Cartesian3(),
  );
  const vecToEnd = Cesium.Cartesian3.subtract(
    projectionEndPosition,
    center,
    new Cesium.Cartesian3(),
  );
  const cross = Cesium.Cartesian3.cross(
    vecToEnd,
    vecToStart,
    new Cesium.Cartesian3(),
  );
  const sign = Math.sign(Cesium.Cartesian3.dot(normal, cross));

  return sign * Cesium.Cartesian3.angleBetween(vecToStart, vecToEnd);
}

async function drawModel(position, url) {
  try {
    const originalMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
    const tilest = await Cesium.Cesium3DTileset.fromUrl(url);
    tilest.modelMatrix = originalMatrix;
    viewer.scene.primitives.add(tilest);
    return tilest;
  } catch (e) {
    console.log("error", e.message);
  }
}

function drawSphere(radius, coordSystemCenter) {
  const sphere = new Cesium.Primitive({
    allowPicking: false, // Отключаем клики по сфере
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.EllipsoidGeometry({
        radii: new Cesium.Cartesian3(radius, radius, radius), // Радиусы сферы
        vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT, // Указываем верный vertexFormat
      }),
      id: "SPHERE",
      modelMatrix: Cesium.Matrix4.fromTranslation(coordSystemCenter),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          Cesium.Color.LIGHTBLUE.withAlpha(0.2),
        ),
      },
      properties: {
        name: "SPHERE",
      },
    }),
    appearance: new Cesium.PerInstanceColorAppearance({
      translucent: true, // Включаем прозрачность
      flat: true,
    }),
    releaseGeometryInstances: false,
  });
  sphere.name = "SPHERE";
  // Устанавливаем светло-голубой цвет с прозрачностью
  sphere.appearance.material = Cesium.Material.fromType("Color", {
    color: Cesium.Color.LIGHTBLUE.withAlpha(0.3), // Полупрозрачный цвет
  });
  return sphere;
}
function normalizeVector(vector) {
  const magnitude = Cesium.Cartesian3.magnitude(vector);
  if (magnitude === 0) {
    //const config = {
    //   type: 'error',
    //  message: 'Не удается нормализовать вектор нулевой длины',
    //  duration: 7000,
    //};
    // this.snackbarService.open(config);
    //return;
  }
  return Cesium.Cartesian3.normalize(vector, new Cesium.Cartesian3());
}
function addAxis(len, position, axisVector, color, name) {
  const normalizedAxis = normalizeVector(axisVector); // Нормализация с проверкой
  const offset = Cesium.Cartesian3.multiplyByScalar(
    normalizedAxis,
    len / 10,
    new Cesium.Cartesian3(),
  );
  const startPoint = Cesium.Cartesian3.add(
    position,
    offset,
    new Cesium.Cartesian3(),
  );
  // Добавление линии оси
  const line = viewer.entities.add({
    polyline: {
      name,
      positions: [
        startPoint,
        Cesium.Cartesian3.add(position, axisVector, new Cesium.Cartesian3()),
      ],
      width: 10.0,
      material: Cesium.Color[color],
      clampToGround: false,
    },
    properties: {
      axis: axisVector,
      name,
      movement: true, // Флаг для перемещения
    },
  });
  return line;
}
function isRotationActive(element) {
  return (
    element?.id?.name === "R" ||
    element?.primitive?.name === "R" ||
    element?.name === "R"
  );
}
function isCoordinateClick(el) {
  return (
    el.id?.properties?.name?.toString() === "Z" ||
    el.id?.properties?.name?.toString() === "Y" ||
    el.id?.properties?.name?.toString() === "X" ||
    el?.id?.name === "R" ||
    el?.name === "R" ||
    el?.primitive?.name === "R" ||
    el.properties?.name?.getValue() === "R"
  );
}

/* function debounce(func, wait) {
  let timeout;
  if (isDragging) {
    // cameraBlockBehavior(false);
  }
  return function () {
    const context = this;

    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      //isDragging = false;
      func.apply(context, args);
    }, wait);
  };
}
const debouncedMouseMove = debounce(listenMouseMove, 50); // Вызываем функцию каждые 100 мс */
