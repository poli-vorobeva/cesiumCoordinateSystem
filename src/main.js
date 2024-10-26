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
  drawScene().then(() => drawRectangles());
  clickHandler();
};

const nameArrows = ["cyl-X", "cyl-Y", "cyl-Z"];
const nameRectangles = ["rect-X", "rect-Y", "rect-Z"];
const arrowProperties = {
  X: {
    degreesX: 0,
    degreesY: 90,
    degreesZ: 0,
  },
  Y: {
    degreesX: -90,
    degreesY: 0,
    degreesZ: 0,
  },
  Z: {
    degreesX: 0,
    degreesY: 0,
    degreesZ: 0,
  },
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
  console.log("coordSystemCenter", coordSystemCenter);
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

  //полукруг

  const an = Math.PI / 20;
  const positions = [];
  const cartographic = Cesium.Cartographic.fromCartesian(coordSystemCenter);

  const adjustedPosition = Cesium.Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    cartographic.height,
  );

  const originalMatrix =
    Cesium.Transforms.eastNorthUpToFixedFrame(adjustedPosition);
  //оси xyz

  const xAxis = addAxis(len, "RED", "X", originalMatrix);
  const yAxis = addAxis(len, "LIGHTGREEN", "Y", originalMatrix);
  const zAxis = addAxis(len, "DODGERBLUE", "Z", originalMatrix);
  data.push(zAxis, yAxis, xAxis);

  for (let i = 0; i <= 20; i++) {
    const ang = an * i - Math.PI / 4;
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
            color: Cesium.Color.DODGERBLUE,
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
  halfCircle.rotateMatrix = Cesium.Matrix3.IDENTITY;
  data.push(halfCircle);
  viewer.scene.primitives.add(halfCircle);
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, HEIGHT + 500),
    duration: 1,
  });
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
  console.log("c", click);
  console.log("primitive", primitive);

  const { longitude, latitude, height } = getModelCoordinates(
    model.modelMatrix,
  );

  //todo у высоты вычесть подъем наверх
  changeInputValue("lat", latitude.toFixed(5));
  changeInputValue("lon", longitude.toFixed(5));
  changeInputValue("h", height.toFixed(0));

  const inverse = viewer.camera.inverseViewMatrix;
  if (click.startPosition.y === click.endPosition.y) return;

  const cartesianStart = getCartesian3ByClick(inverse, click.startPosition);
  const cartesian = getCartesian3ByClick(inverse, click.endPosition);
  const sub = Cesium.Cartesian3.subtract(
    cartesian,
    cartesianStart,
    new Cesium.Cartesian3(),
  );
  const axisVector = primitive.primitive.axis;
  const axisvectorMagnitude = Cesium.Cartesian3.magnitude(axisVector);
  let dot = Cesium.Cartesian3.dot(sub, axisVector);

  dot /= axisvectorMagnitude * axisvectorMagnitude; //высчитываем коэф шага движения !!!!

  const translation = Cesium.Cartesian3.multiplyByScalar(
    axisVector,
    dot,
    new Cesium.Cartesian3(),
  );

  const offsetWithoutCollect = Cesium.Matrix4.fromTranslation(translation);
  const arrows = data.filter((item) => nameArrows.includes(item.name));
  arrows.forEach((arrow) => {
    Cesium.Matrix4.multiply(
      offsetWithoutCollect,
      arrow.modelMatrix,
      arrow.modelMatrix,
    );
  });

  const lines = data.filter((item) => ["X", "Y", "Z"].includes(item.name));
  lines.forEach((line) => {
    Cesium.Matrix4.multiply(
      offsetWithoutCollect,
      line.modelMatrix,
      line.modelMatrix,
    );
  });

  const rectangles = data.filter((item) => nameRectangles.includes(item.name));
  rectangles.forEach((rectangle) => {
    Cesium.Matrix4.multiply(
      offsetWithoutCollect,
      rectangle.modelMatrix,
      rectangle.modelMatrix,
    );
  });

  Cesium.Matrix4.multiply(
    offsetWithoutCollect,
    model.modelMatrix,
    model.modelMatrix,
  );
  // Cesium.Matrix4.multiply(
  //   offsetWithoutCollect,
  //   primitive.primitive.modelMatrix,
  //   primitive.primitive.modelMatrix,
  // );
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

function getAngleFromMatrix(matrix) {
  const x = matrix[0];
  const y = -matrix[1];
  const angleInRadians = Math.atan2(y, x);
  return Cesium.Math.toDegrees(angleInRadians);
}

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

  const fromRotationZ = Cesium.Matrix3.fromRotationZ(angleR);
  const rotationMatrix4 = Cesium.Matrix4.fromRotationTranslation(fromRotationZ);

  primitive.primitive.rotateMatrix = Cesium.Matrix3.multiply(
    primitive.primitive.rotateMatrix,
    fromRotationZ,
    new Cesium.Matrix3(),
  );

  changeInputValue("rot", getAngleFromMatrix(primitive.primitive.rotateMatrix));

  model.rotateMatrix = Cesium.Matrix3.multiply(
    model.rotateMatrix,
    fromRotationZ,
    new Cesium.Matrix3(),
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
  const arrowName = !t
    ? viewer.scene
        .drillPick(click.position)
        .find((item) => nameArrows.includes(item?.primitive?.name))?.primitive
        ?.name
    : undefined;
  const rectangleName = !t
    ? viewer.scene
        .drillPick(click.position)
        .find((item) => nameRectangles.includes(item?.primitive?.name))
        ?.primitive?.name
    : undefined;
  if (t) {
    primitive = t;
    cameraBlockBehavior(false);
  } else if (arrowName || rectangleName) {
    const name = (itemName) =>
      arrowName ? "cyl-" + itemName : "rect-" + itemName;
    const lineFromData = data.find(
      (item) => name(item.name) === (arrowName || rectangleName),
    );
    primitive = { primitive: lineFromData };
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
    Cesium.Cartesian3.dot(rayStart.origin, normal) + distance;

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
    vecToStart,
    vecToEnd,
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
    tilest.rotateMatrix = Cesium.Matrix3.IDENTITY;
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
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          Cesium.Color.LIGHTBLUE.withAlpha(0.2),
        ),
      },
      properties: {
        name: "SPHERE",
      },
    }),
    modelMatrix: Cesium.Matrix4.fromTranslation(coordSystemCenter),
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

function addAxis(len, color, name, originalMatrix) {
  const startPoint = new Cesium.Cartesian3(
    name === "X" ? len / 10 : 0,
    name === "Y" ? len / 10 : 0,
    name == "Z" ? len / 10 : 0,
  );
  const endPoint = new Cesium.Cartesian3(
    name === "X" ? len : 0,
    name === "Y" ? len : 0,
    name == "Z" ? len : 0,
  );
  // Добавление линии оси
  const polylineGeometry = new Cesium.PolylineGeometry({
    positions: [startPoint, endPoint],
    width: 10.0,
    vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
  });
  const geometryInstance = new Cesium.GeometryInstance({
    geometry: polylineGeometry,
    attributes: {
      color: Cesium.ColorGeometryInstanceAttribute.fromColor(
        Cesium.Color[color],
      ),
    },
    id: name,
  });
  const cloneMatrix = Cesium.Matrix4.clone(originalMatrix);
  const line = viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: geometryInstance,
      modelMatrix: cloneMatrix,
      appearance: new Cesium.PolylineMaterialAppearance({
        material: Cesium.Material.fromType("Color", {
          color: Cesium.Color[color],
        }),
      }),
    }),
  );
  const rotateMatrix = Cesium.Matrix4.getMatrix3(
    cloneMatrix,
    new Cesium.Matrix3(),
  );
  const axisVector = Cesium.Matrix3.multiplyByVector(
    rotateMatrix,
    endPoint,
    new Cesium.Cartesian3(),
  );
  line.axis = Cesium.Cartesian3.normalize(axisVector, axisVector);
  line.movement = true; // флаг перемещения
  line.name = name;
  const cylinder = addCylinder(
    color,
    endPoint,
    cloneMatrix,
    name,
    arrowProperties[name].degreesX,
    arrowProperties[name].degreesY,
    arrowProperties[name].degreesZ,
  );
  data.push(cylinder);
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
    el.id === "Z" ||
    el.id === "Y" ||
    el.id === "X" ||
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

function addCylinder(
  color,
  position,
  modelMatrix,
  name,
  degreesX,
  degreesY,
  degreesZ,
) {
  // добавление цилиндра. degrees - углы в градусах для вращения по каждой из осей X, Y и Z.
  const cylinder = new Cesium.CylinderGeometry({
    length: 4, // Высота цилиндра
    topRadius: 0, // Радиус верхней части (0 делает его конусом)
    bottomRadius: 2, // Радиус нижней части цилиндра
  });

  // Преобразование углы из градусов в радианы
  const rotationAngleX = Cesium.Math.toRadians(degreesX);
  const rotationAngleY = Cesium.Math.toRadians(degreesY);
  const rotationAngleZ = Cesium.Math.toRadians(degreesZ);

  // кватернионы для вращения по осям
  const quaternionX = Cesium.Quaternion.fromAxisAngle(
    // Представление вращения как кватерниона
    new Cesium.Cartesian3(1, 0, 0), // Ось X
    rotationAngleX, // Угол вращения
  );
  const rotationMatrixX = Cesium.Matrix3.fromQuaternion(quaternionX);

  const quaternionY = Cesium.Quaternion.fromAxisAngle(
    new Cesium.Cartesian3(0, 1, 0), // Ось Y
    rotationAngleY, // Угол вращения
  );
  const rotationMatrixY = Cesium.Matrix3.fromQuaternion(quaternionY);

  const quaternionZ = Cesium.Quaternion.fromAxisAngle(
    new Cesium.Cartesian3(0, 0, 1),
    rotationAngleZ,
  );
  const rotationMatrixZ = Cesium.Matrix3.fromQuaternion(quaternionZ);

  // Комбинируем матрицы вращения (сначала X с Y, затем с Z)
  let combinedRotationMatrix = Cesium.Matrix3.multiply(
    rotationMatrixX, // Вращение по X
    rotationMatrixY, // Вращение по Y
    new Cesium.Matrix3(),
  );
  combinedRotationMatrix = Cesium.Matrix3.multiply(
    combinedRotationMatrix, // Результат вращения по X и Y
    rotationMatrixZ, // Вращение по Z
    combinedRotationMatrix,
  );

  const combineRotateTranslateMatrix = Cesium.Matrix4.fromRotationTranslation(
    combinedRotationMatrix,
    position,
    new Cesium.Matrix4(),
  );

  // Применяем комбинированное вращение к модельной матрице цилиндра
  //const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position); // матрица трансформации для позиции цилиндра
  const cloneModelMatrix = Cesium.Matrix4.clone(modelMatrix);

  Cesium.Matrix4.multiply(
    cloneModelMatrix, // Исходная матрица
    combineRotateTranslateMatrix, // Комбинированная матрица вращения
    cloneModelMatrix, // Результат сохраняется в этой же матрице
  );

  // экземпляр геометрии цилиндра с комбинированной модельной матрицей
  const geometry = new Cesium.GeometryInstance({
    geometry: cylinder, // Геометрия цилиндра
    // Модельная матрица с примененным вращением
  });

  const cylinderPrimitive = new Cesium.Primitive({
    geometryInstances: geometry,
    appearance: new Cesium.MaterialAppearance({
      material: Cesium.Material.fromType("Color", {
        color: Cesium.Color[color],
      }),
    }),
    properties: {
      name: `cyl-${name}`,
    },
    modelMatrix: cloneModelMatrix,
  });
  cylinderPrimitive.name = `cyl-${name}`;
  cylinderPrimitive.rotateMatrix = combineRotateTranslateMatrix;

  viewer.scene.primitives.add(cylinderPrimitive);

  return cylinderPrimitive;
}

function drawRectangles() {
  const heightAboveGround = 0; // HEIGHT; // Высота над землей

  const getSurfaceNormal = () => {
    const surfaceNormal = new Cesium.Cartesian3();
    Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(center, surfaceNormal);
    return surfaceNormal;
  };
  const surfaceNormal = getSurfaceNormal();
  const radiusOffset = model.boundingSphere.radius;

  const zAxisDerectionOffset = Cesium.Cartesian3.multiplyByScalar(
    surfaceNormal,
    radiusOffset,
    new Cesium.Cartesian3(),
  );
  let newCenter = Cesium.Cartesian3.add(
    center,
    zAxisDerectionOffset,
    new Cesium.Cartesian3(),
  );
  console.log("newCenter", newCenter);
  const cartographic = Cesium.Cartographic.fromCartesian(newCenter);

  const adjustedPosition = Cesium.Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    cartographic.height,
  );

  const originalMatrix =
    Cesium.Transforms.eastNorthUpToFixedFrame(adjustedPosition);

  newCenter = new Cesium.Cartesian3();
  const blueRectangle = addRectangle(
    // new Cesium.PolygonHierarchy(positionsBlue),
    new Cesium.Cartesian3(15, 15, 0),
    10,
    10,
    0.5,
    "DODGERBLUE",
    "Z",
    originalMatrix,
  );

  const greenRectangle = addRectangle(
    new Cesium.Cartesian3(15, 0, 15),
    10,
    0.5,
    10,
    "LIGHTGREEN",
    "Y",
    originalMatrix,
  );

  const redRectangle = addRectangle(
    new Cesium.Cartesian3(0, 15, 15),
    0.5,
    10,
    10,
    "RED",
    "X",
    originalMatrix,
  );
  console.log("**");
  data.push(redRectangle, greenRectangle, blueRectangle);
  console.log("@@@");
}

function addRectangle(center, xW, yW, hW, color, name, modelMatrix) {
  //console.log(">>>", height, heightAboveGround);

  const box = new Cesium.BoxGeometry({
    //vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
    maximum: new Cesium.Cartesian3(
      center.x + xW / 2,
      center.y + yW / 2,
      center.z + hW / 2,
    ),
    minimum: new Cesium.Cartesian3(
      center.x - xW / 2,
      center.y - yW / 2,
      center.z - hW / 2,
    ),
  });
  //console.log(box, "BOX");
  const geometry = Cesium.BoxGeometry.createGeometry(box);
  /*   const rectangleGeometry = new Cesium.PolygonGeometry({
    polygonHierarchy: hierarchy, // Иерархия вершин полигона
    extrudedHeight: heightAboveGround, //heightAboveGround, // Высота выдавливания (для создания объема)
    height: height, // Базовая высота полигона
  }); */
  //console.log("recGEOMET", rectangleGeometry);
  // Создаем экземпляр геометрии
  const geometryInstance = new Cesium.GeometryInstance({
    geometry: geometry,
  });

  const rectanglePrimitive = new Cesium.Primitive({
    asynchronous: false,
    geometryInstances: geometryInstance,
    modelMatrix: modelMatrix,
    appearance: new Cesium.MaterialAppearance({
      material: new Cesium.Material({
        fabric: {
          type: "Color",
          uniforms: {
            color: Cesium.Color[color].withAlpha(0.3),
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
  console.log("rectanglePrimitive", rectanglePrimitive);
  rectanglePrimitive.name = `rect-${name}`;
  viewer.scene.primitives.add(rectanglePrimitive);

  return rectanglePrimitive;
}

const lonInput = document.getElementById("lon");
const latInput = document.getElementById("lat");
const heiInput = document.getElementById("h");
const rotInput = document.getElementById("rot");

heiInput.value = HEIGHT;
lonInput.value = lon;
latInput.value = lat;

const inputs = {
  lat: latInput,
  lon: lonInput,
  h: heiInput,
  rot: rotInput,
};
function changeInputValue(inputType, value) {
  inputs[inputType].value = +value;
}

function handleTypeInput(event) {
  const id = event?.srcElement?.id;
  const value = event.target.value;
  if (id !== "rot") {
    moveByInput(value, id);
  } else {
    rotateByInput(id);
  }
}

const inputClick = (event) => {
  const id = event?.srcElement?.id;
  const value = event.target.value;
  if (id !== "rot") {
    moveByInput(value, id);
  } else {
    rotateByInput(id);
  }
};

function moveByInput(value, id) {
  inputs[id].value = value;
  const newPositionModel = Cesium.Cartesian3.fromDegrees(
    +inputs.lon.value,
    +inputs.lat.value,
    +inputs.h.value,
  );
  const newModelMatrix =
    Cesium.Transforms.eastNorthUpToFixedFrame(newPositionModel);
  Cesium.Matrix4.multiplyByMatrix3(
    newModelMatrix,
    model.rotateMatrix,
    newModelMatrix,
  );
  model.modelMatrix = newModelMatrix;

  const rect = data.find((item) => item.name === "rect-Y");
  const { height: heightGizmo } = getModelCoordinates(rect.modelMatrix);

  const delta = model.boundingSphere.radius;

  const newHeightGizmo = id === "h" ? Number(value) + delta : heightGizmo;
  const newPositionGizmo = Cesium.Cartesian3.fromDegrees(
    +inputs.lon.value,
    +inputs.lat.value,
    newHeightGizmo,
  );

  const newMatrixGizmo =
    Cesium.Transforms.eastNorthUpToFixedFrame(newPositionGizmo);

  data.forEach((item) => {
    const cloneMatrix = Cesium.Matrix4.clone(newMatrixGizmo);
    if (item.name === "R") {
      Cesium.Matrix4.multiplyByMatrix3(
        cloneMatrix,
        item.rotateMatrix,
        cloneMatrix,
      );
    } else if (nameArrows.includes(item.name)) {
      Cesium.Matrix4.multiply(cloneMatrix, item.rotateMatrix, cloneMatrix);
    }
    item.modelMatrix = cloneMatrix;
  });
}

function rotateByInput(id) {
  const halfCircle = data.find((item) => item.name === "R");
  const oldValue = getAngleFromMatrix(halfCircle.rotateMatrix);
  const newValue = inputs[id].value;
  const newDegrees = oldValue - newValue;

  const fromRotationZ = Cesium.Matrix3.fromRotationZ(
    Cesium.Math.toRadians(newDegrees),
  );
  const rotationMatrix4 = Cesium.Matrix4.fromRotationTranslation(fromRotationZ);

  halfCircle.rotateMatrix = Cesium.Matrix3.multiply(
    halfCircle.rotateMatrix,
    fromRotationZ,
    new Cesium.Matrix3(),
  );

  model.rotateMatrix = Cesium.Matrix3.multiply(
    model.rotateMatrix,
    fromRotationZ,
    new Cesium.Matrix3(),
  );

  Cesium.Matrix4.multiply(
    halfCircle.modelMatrix,
    rotationMatrix4,
    halfCircle.modelMatrix,
  );
  Cesium.Matrix4.multiply(
    model.modelMatrix,
    rotationMatrix4,
    model.modelMatrix,
  );
}

lonInput.addEventListener("click", inputClick);
latInput.addEventListener("click", inputClick);
heiInput.addEventListener("click", inputClick);
rotInput.addEventListener("click", inputClick);
lonInput.addEventListener("change", handleTypeInput);
latInput.addEventListener("change", handleTypeInput);
heiInput.addEventListener("change", handleTypeInput);
rotInput.addEventListener("change", handleTypeInput);
//rotInput.addEventListener("click", inputClick);
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

function getModelCoordinates(modelMatrix) {
  // Извлекаем позицию модели из modelMatrix
  const modelPosition = new Cesium.Cartesian3();
  Cesium.Matrix4.getColumn(modelMatrix, 3, modelPosition);

  // Преобразуем в картографические координаты
  const cartographic = Cesium.Cartographic.fromCartesian(modelPosition);
  // Получаем долготу, широту и высоту
  const longitude = Cesium.Math.toDegrees(cartographic.longitude);
  const latitude = Cesium.Math.toDegrees(cartographic.latitude);

  const height = cartographic.height;

  return {
    longitude,
    latitude,
    height,
  };
}
