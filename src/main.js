import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";

const data = [];
// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});
/* const d = {
  RED: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString("RED")),
  GREEN: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString("GREEN")),
  PINK: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString("PINK")),
}; */
const HEIGHT = 3000;
let primitive = null;
const worldTileset = await Cesium.createGooglePhotorealistic3DTileset();
viewer.scene.primitives.add(worldTileset);
const currentPrimitives = new Set();
const buildingTileset = await Cesium.createOsmBuildingsAsync();
viewer.scene.primitives.add(buildingTileset);

const lon = 37.631099;
const lat = 55.753428;
const coordinateSystemPrimitives = [];
const center = Cesium.Cartesian3.fromDegrees(lon, lat, HEIGHT);
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
const drawArc = () => {
  drawSphere();
  clickHandler();
  // drawArrow()
  //createArc(center,1002,Cesium.Math.toRadians(0),Cesium.Math.toRadians(90.0),Cesium.Color.BLUEVIOLET)
};
const names = new Set(["X", "Y", "Z", "R", "SPHERE"]);

function drawSphere() {
  const radius = 100;
  const len = 120;
  //сфера примитив
  const positionMoscow = {
    lon: 37.6, //долгота
    lat: 55.7,
  };
  var sphere = new Cesium.Primitive({
    allowPicking: false, // Отключаем клики по сфере
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.EllipsoidGeometry({
        radii: new Cesium.Cartesian3(radius, radius, radius), // Радиусы сферы
        vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT, // Указываем верный vertexFormat
      }),
      id: "SPHERE",
      modelMatrix: Cesium.Matrix4.fromTranslation(center),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          Cesium.Color.RED.withAlpha(0.2),
        ), // Полупрозрачный светло-голубой цвет
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
    color: Cesium.Color.RED.withAlpha(0.3), // Полупрозрачный цвет
  });

  viewer.scene.primitives.add(sphere);

  // Создаем сферу
  /*   const sphere = viewer.entities.add({
    position: center,
    properties: {
      name: "SPHERE",
    },
    ellipsoid: {
      radii: new Cesium.Cartesian3(radius, radius, radius),
      material: Cesium.Color.LIGHTBLUE.withAlpha(0.3), // Полупрозрачный синий цвет,
      clampToGround: false,
    },
  }); */
  data.push(sphere);
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
  function addAxis(position, axisVector, color, name) {
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
        // new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(color)),
        clampToGround: false,
      },
      properties: {
        axis: axisVector,
        name,
        movement: true, // Флаг для перемещения
      },
    });
    // this.addRotationPlane(position, normalizedAxis);
    return line;
  }
  function copyAddAxis(color, name) {
    const line = viewer.entities.add({
      polyline: {
        name,
        positions: [
          new Cesium.Cartesian3(
            name === "X" ? len / 10 : 0,
            name === "Y" ? len / 10 : 0,
            name === "Z" ? len / 10 : 0,
          ),
          new Cesium.Cartesian3(
            name === "X" ? len : 0,
            name === "Y" ? len : 0,
            name === "Z" ? len : 0,
          ),
        ],
        width: 10.0,
        material: Cesium.Color[color],
        // new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(color)),
        clampToGround: false,
      },
      properties: {
        //axis: axisVector,
        name,
        // movement: true, // Флаг для перемещения
      },
    });
    // this.addRotationPlane(position, normalizedAxis);
    return line;
  }

  /*  const xAxis = copyAddAxis("RED", "X");
  const yAxis = copyAddAxis("GREEN", "Y");
  const zAxis = copyAddAxis("PINK", "Z"); */
  const xAxis = addAxis(center, xAxisDirection, "RED", "X");
  const yAxis = addAxis(center, yAxisDirection, "GREEN", "Y");
  const zAxis = addAxis(center, zAxisDirection, "PINK", "Z");
  //  data.push(zAxis);
  //полукруг

  const an = -Math.PI / 20;
  const positions = [];
  const cartographic = Cesium.Cartographic.fromCartesian(center);

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
    positions.push(
      Cesium.Matrix4.multiplyByPoint(
        originalMatrix,
        new Cesium.Cartesian3(x, y, 0),
        new Cesium.Cartesian3(),
      ),
    );
    // positions.push(new Cesium.Cartesian3(x, y, 0));
  }
  //-----------------

  // Профиль - прямоугольник
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
  console.log("positions", positions);
  const polylineVolume = new Cesium.PolylineVolumeGeometry({
    polylinePositions: positions,
    shapePositions: computeCircle(2.0),
  });

  // Создаем экземпляр геометрии
  const geometryInstance = new Cesium.GeometryInstance({
    geometry: polylineVolume,
  });

  // Создаем примитив с материалом
  const primitive = new Cesium.Primitive({
    geometryInstances: [geometryInstance],
    appearance: new Cesium.MaterialAppearance({
      material: new Cesium.Material({
        fabric: {
          type: "Color",
          uniforms: {
            color: Cesium.Color.BLUE,
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

  // Добавляем примитив на сцену
  viewer.scene.primitives.add(primitive);

  viewer.zoomTo(viewer.entities);
  // Создаем круг как полигон

  drawModel(center, "./assets/model_2.glb");
}

const button = document.getElementById("draw");
button.addEventListener("click", drawArc);
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
  // Здесь ваш код, который будет выполняться при нажатии на левую кнопку мыши
}
let t = false;
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

  // Преобразуем декартовы координаты в геодезические
  const cartographicStart = Cesium.Cartographic.fromCartesian(cartesianStart);
  //const longitudeStart = Cesium.Math.toDegrees(cartographicStart.longitude); //*(direction==='up'?-1:1);
  //const latitudeStart = Cesium.Math.toDegrees(cartographicStart.latitude);

  const cartesian = getCartesian3ByClick(inverse, click.endPosition);
  // Преобразуем декартовы координаты в геодезические
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  //const longitude = Cesium.Math.toDegrees(cartographic.longitude); //*(direction==='up'?-1:1);
  //const latitude = Cesium.Math.toDegrees(cartographic.latitude);

  const sub = Cesium.Cartesian3.subtract(
    cartesian,
    cartesianStart,
    new Cesium.Cartesian3(),
  );
  const axisVector = primitive.id?.properties.axis.getValue();
  //const magnitude = Cesium.Cartesian3.magnitude(sub);
  const axisvectorMagnitude = Cesium.Cartesian3.magnitude(axisVector);
  const name = primitive.id?.properties.name.getValue();
  let dot = Cesium.Cartesian3.dot(sub, axisVector);

  dot /= axisvectorMagnitude * axisvectorMagnitude; //высчитываем коэф шага движения !!!!

  const translation = Cesium.Cartesian3.multiplyByScalar(
    axisVector,
    dot,
    new Cesium.Cartesian3(),
  );
  //primitive.primitive.modelMatrix.ge;

  const translateOld = Cesium.Matrix4.getTranslation(
    primitive.primitive.modelMatrix,
    new Cesium.Cartesian3(),
  );
  const offsetWithoutCollect = Cesium.Matrix4.fromTranslation(translation);
  const offsetCollect = Cesium.Matrix4.fromTranslation(
    Cesium.Cartesian3.add(translation, translateOld, new Cesium.Cartesian3()),
  );

  /*   const newModelMatrix = Cesium.Matrix4.multiply(
    primitive.primitive.modelMatrix,
    hh,
    new Cesium.Matrix4(),
  ); */

  primitive.primitive.modelMatrix = offsetCollect; //newModelMatrix;
  // console.log("data", data);

  const halfCircle = data.find((en) => en.name === "R");
  // console.log(halfCircle, "HC");
  if (halfCircle) {
    halfCircle.modelMatrix = offsetCollect;
    //  const halfposition = halfCircle.position.getValue();
    // console.log("halfposition", halfposition);
    /*  const newHalfPosiiton = Cesium.Matrix4.multiplyByPoint(
      offsetWithoutCollect,
      new Cesium.Cartesian3(halfposition.x, halfposition.y, halfposition.z), //у экрана У направлена вниз поэтому -
      new Cesium.Cartesian3(),
    ); */
    //console.log("newHalfPosiiton", newHalfPosiiton);
    //halfCircle.position(newHalfPosiiton);
    //halfCircle.position = newHalfPosiiton;
  }

  const sphere = data.find((en) => en.name === "SPHERE");
  // console.log(sphere, "SPHERE", sphere?.ellipsoid);

  sphere.modelMatrix = offsetCollect;

  if (isDragging) {
    cameraBlockBehavior(false);
  }
};
function listenMouseMove(click) {
  console.log("primitiveName", primitive?.id?.name);
  if (primitive?.id?.name === "R") {
    //поворот
    console.log("primitiveeee", primitive.primitive);
    //  const center = primitive.id.position.getValue();
    /*   const centerModelMatrix = Cesium.Matrix4.getTranslation(
      primitive.primitive.modelMatrix,
    ); */
    const inverse = viewer.camera.inverseViewMatrix;
    // console.log("CLCLC", click);
    const startPoint = getCartesian3ByClick(inverse, click.startPosition);
    const endPoint = getCartesian3ByClick(inverse, click.endPosition);

    const firstVector = Cesium.Cartesian3.subtract(
      startPoint,
      primitive?.id?.center,
      new Cesium.Cartesian3(),
    );
    const secondVector = Cesium.Cartesian3.subtract(
      endPoint,
      primitive?.id?.center,
      new Cesium.Cartesian3(),
    );

    const angle = Cesium.Cartesian3.angleBetween(firstVector, secondVector);
    const angleDegr = (angle * 180) / Math.PI;
    console.log("angle", angleDegr);
    // rotateModel();
    console.log("brfore", primitive.primitive.modelMatrix);

    const rotationMatrix4 = Cesium.Matrix4.fromRotationTranslation(
      Cesium.Matrix3.fromRotationY(angle),
    );

    Cesium.Matrix4.multiply(
      primitive.primitive.modelMatrix,
      rotationMatrix4,
      primitive.primitive.modelMatrix,
    );
    console.log("AFTER---", primitive.primitive.modelMatrix);
    //надо определить угол поворота и вызвать для дуги и здания rotate
  } else {
    moveElements(click);
  }
  handler.setInputAction(listenMoveStop, Cesium.ScreenSpaceEventType.LEFT_UP);
}

function debounce(func, wait) {
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
const debouncedMouseMove = debounce(listenMouseMove, 50); // Вызываем функцию каждые 100 мс

function listenMouseDown(click) {
  console.log("down listen", click);
  console.log(
    "viewer.scene.drillPick(click.position)",
    viewer.scene.drillPick(click.position),
  );

  const t = viewer.scene
    .drillPick(click.position)
    .find(
      (el) =>
        el.id?.properties?.name?.toString() === "Z" ||
        el.id?.properties?.name?.toString() === "Y" ||
        el.id?.properties?.name?.toString() === "X" ||
        el?.id?.name === "R" ||
        el?.name === "R" ||
        el.properties?.name?.getValue() === "R",
    );
  console.log("t", t);
  if (t) {
    primitive = t;
  } else {
    cameraBlockBehavior(true);
    return;
  }
  isDragging = true;
  handler.setInputAction(
    listenMouseMove,
    //debouncedMouseMove,
    Cesium.ScreenSpaceEventType.MOUSE_MOVE,
  );
}
function clickHandler() {
  handler.setInputAction(
    listenMouseDown,
    Cesium.ScreenSpaceEventType.LEFT_DOWN,
  );
}

function rotateModel(tileset, axis, ang) {
  if (tileset) {
    const angle = Cesium.Math.toRadians(ang); // вращаем на 5 градусов
    let rotationMatrix; //: Cesium.Matrix3;

    /*  if (Cesium.Cartesian3.equals(axis, Cesium.Cartesian3.UNIT_X)) {
      rotationMatrix = Cesium.Matrix3.fromRotationX(angle);
    } else if (Cesium.Cartesian3.equals(axis, Cesium.Cartesian3.UNIT_Y)) { */
    rotationMatrix = Cesium.Matrix3.fromRotationY(angle);
    /*  } else {
      rotationMatrix = Cesium.Matrix3.fromRotationZ(angle);
    } */

    const rotationMatrix4 =
      Cesium.Matrix4.fromRotationTranslation(rotationMatrix);
    Cesium.Matrix4.multiply(
      tileset.root.transform,
      rotationMatrix4,
      tileset.root.transform,
    );
  }
}

function getAngle(normal, center, click) {
  const distance = -Cesium.Cartesian3.dot(normal, center);

  const rayStart = viewer.camera.getPickRay(click.StartPosition);
  const rayEnd = viewer.camera.getPickRay(click.EndPosition);

  const negateNormal = Cesium.Cartesian3.negate(
    normal,
    new Cesium.Cartesian3(),
  );

  const inclineCameraStart = Cartesian3.angleBetween(
    negateNormal,
    rayStart.direction,
  );
  const inclineCameraEnd = Cartesian3.angleBetween(
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

  return Cartesian3.angleBetween(vecToStart, vecToEnd);
}

/*   const halfC = viewer.entities.add({
    polyline: {
      positions: positions,
      width: 10.0,
      material: Cesium.Color.YELLOW,
      modelMatrix: originalMatrix,
      // new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(color)),
      clampToGround: false,
    },
    // modelMatrix: originalMatrix,
    properties: {
      //movement: true, // Флаг для перемещения
    },
  }); */
//-----------------------------------Полукруг
/*   var halfCircle = new Cesium.Primitive({
    // allowPicking: true, // Отключаем клики по сфере
    releaseGeometryInstances: true,
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.EllipsoidGeometry({
        radii: new Cesium.Cartesian3(radius, radius, radius),
        innerRadii: new Cesium.Cartesian3(
          radius * 0.95,
          radius * 0.95,
          radius * 0.95,
        ),
        vertexFormat: Cesium.VertexFormat.ALL,
        minimumCone: Cesium.Math.toRadians(89.0),
        maximumCone: Cesium.Math.toRadians(91.0),
        minimumClock: Cesium.Math.toRadians(0.0),
        maximumClock: Cesium.Math.toRadians(-180.0),
        //  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
      }),
      id: "R",
      //modelMatrix: originalMatrix,
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          Cesium.Color.BLUE.withAlpha(0.9),
        ), // Полупрозрачный светло-голубой цвет
      },
    }),

    modelMatrix: originalMatrix,
    appearance: new Cesium.MaterialAppearance({
      material: new Cesium.Material({
        fabric: {
          type: "Color",
          uniforms: {
            color: Cesium.Color.WHITE.withAlpha(0.35),
          },
        },
      }),
    }),
    // releaseGeometryInstances: false,
  });
  console.log("HALF", halfCircle);
  viewer.scene.primitives.add(halfCircle); */

async function drawModel(position, url) {
  return;
  try {
    //   console.log("$$$$", position);
    /*   const cartographic = Cesium.Cartographic.fromCartesian(
      new Cartesian3(position.x, position.y, position.z),
    ); */
    //console.log("$$$$2", cartographic);
    /*  const adjustedPosition = Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height,
    ); */
    // console.log("###", adjustedPosition);
    const originalMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
    const dataForService = {
      id: "BUILD",
      checked: true,
      url,
      type: "PRIMITIVE",
      options: {
        modelMatrix: originalMatrix,
      },
    };
    //console.log("originalMatrix", originalMatrix);
    // console.log("dataForService", dataForService);
    const tilest = await Cesium.Cesium3DTileset(dataForService);
    //  console.log("666", tilest);
    viewer.scene.primitives.add(tilest);
  } catch (e) {
    console.log("error", e.message);
  }
}

/*   primitive.appearance.material = Cesium.Material.fromType("Color", {
    color: Cesium.Color.YELLOW, // Полупрозрачный цвет
  }); */
// Добавляем примитив в сцену

//console.log(viewer.scene.primitives);
// viewer.entities.modelMatrix = originalMatrix;
// halfC.id = "R";
// halfC.name = "R";
//const en = viewer.entities.getById(halfC.id);

/*  console.log(
    "viewer.entities.getById('R').modelMatrix",
    viewer.entities.getById(halfC.id),
  ); */
/*  en.modelMatrix = originalMatrix;
  console.log("HHHHHH", halfC); */
/* halfC.center = Cesium.Cartesian3.clone(center);
  data.push(halfC); */
/*  var halfCircle = new Cesium.Primitive({
    allowPicking: false, // Отключаем клики по сфере
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.EllipsoidGeometry({
        radii: new Cesium.Cartesian3(radius, radius, radius),
        innerRadii: new Cesium.Cartesian3(
          radius * 0.95,
          radius * 0.95,
          radius * 0.95,
        ),
        minimumCone: Cesium.Math.toRadians(89.0),
        maximumCone: Cesium.Math.toRadians(91.0),
        minimumClock: Cesium.Math.toRadians(0.0),
        maximumClock: Cesium.Math.toRadians(-180.0),
        vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
      }),
      id: "R",
      modelMatrix: originalMatrix,
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          Cesium.Color.BLUE.withAlpha(0.9),
        ), // Полупрозрачный светло-голубой цвет
      },
    }),
    appearance: new Cesium.PerInstanceColorAppearance({
      translucent: true, // Включаем прозрачность
      flat: true,
    }),
    releaseGeometryInstances: false,
  });
  console.log("HALF", halfCircle);
  viewer.scene.primitives.add(halfCircle); */
/*  const halfCircle = viewer.entities.add({
    name: "R",
    position: center,
    ellipsoid: {
      // radii: center,
      radii: new Cesium.Cartesian3(radius, radius, radius),
      innerRadii: new Cesium.Cartesian3(radius - 5, radius - 5, radius - 5),
      minimumCone: Cesium.Math.toRadians(89.0),
      maximumCone: Cesium.Math.toRadians(91.0),
      minimumClock: Cesium.Math.toRadians(0.0),
      maximumClock: Cesium.Math.toRadians(-180.0),
      material: Cesium.Color.DARKBLUE,
      outline: false,
    },
    properties: {
      name: "R",
    },
  }); */
//halfCircle.name = "R";
// data.push(halfCircle);
/*  console.log(viewer.entities); */
