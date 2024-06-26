// please note that the relative folder is related with the version number.
import * as THREE from '../threejs-165/three.module.min.js';
//import Stats from '../threejs-165/addons/libs/stats.module.js';
//import { GPUStatsPanel } from '../threejs-165/addons/utils/GPUStatsPanel.js';
import { GUI } from '../threejs-165/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from '../threejs-165/addons/controls/OrbitControls.js';
// lines
import { Line2 } from '../threejs-165/addons/lines/Line2.js';
import { LineMaterial } from '../threejs-165/addons/lines/LineMaterial.js';
import { LineGeometry } from '../threejs-165/addons/lines/LineGeometry.js';
import { LineSegments2 } from '../threejs-165/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from '../threejs-165/addons/lines/LineSegmentsGeometry.js';
// text
import { Font } from '../threejs-165/addons/loaders/FontLoader.js';
import { TextGeometry } from '../threejs-165/addons/geometries/TextGeometry.js';
// label
import { CSS2DRenderer, CSS2DObject } from '../threejs-165/addons/renderers/CSS2DRenderer.js';
// exporters
import { SVGRenderer } from '../threejs-165/addons/renderers/SVGRenderer.js';
import { GLTFExporter } from '../threejs-165/addons/exporters/GLTFExporter.js';
import { PLYExporter } from '../threejs-165/addons/exporters/PLYExporter.js';
import { STLExporter } from '../threejs-165/addons/exporters/STLExporter.js';
import { DRACOExporter } from '../threejs-165/addons/exporters/DRACOExporter.js';
// module Widget
class tjViewer{
  constructor(el, width, height){
    //viewer
    this.width = width;
    this.height = height;
    // viewport
    this.insetWidth = height / 4; // square
    this.insetHeight = height / 4;
    
    this.renderer = new THREE.WebGLRenderer( { antialias: true } );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( width, height );
    this.renderer.setClearColor( 0x000000, 0.0 );
    this.animate = this.animate.bind(this);
    this.renderer.setAnimationLoop( this.animate );
    el.appendChild(this.renderer.domElement);
    
    // label renderer
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize( width, height );
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = this.renderer.domElement.getBoundingClientRect().top+'px';
    this.labelRenderer.domElement.style.left = this.renderer.domElement.getBoundingClientRect().left+'px';
    el.appendChild(this.labelRenderer.domElement);
    
    this.scene = new THREE.Scene();
    
    var near = .0001
    var far = 100
    var fov = 50
    this.camera = new THREE.PerspectiveCamera( fov, width / height, near, far );
    this.camera.position.set( 0, 0, -far/10 ); // set to x, y, z;
    this.camera.layers.enableAll();
    
    // viewport
    this.camera2 = new THREE.PerspectiveCamera( fov, 1, near, far );
    this.camera2.position.copy( this.camera.position );
    
    this.controls = new OrbitControls( this.camera, this.labelRenderer.domElement );
    this.controls.enableDamping = true;
    this.controls.minDistance = near*2;
    this.controls.maxDistance = far/2;
    /*
    this.stats = new Stats();
    el.appendChild(this.stats.dom);
    
    this.gpuPanel = new GPUStatsPanel( this.renderer.getContext() );
    this.stats.addPanel( this.gpuPanel );
    this.stats.showPanel( 0 );*/
    
    this.materials = [];
    this.objects = [];
    this.background = new THREE.Color(1, 1, 1);
    this.bckalpha = 1;
    
    el.parentElement.addEventListener('wheel', (event)=>{
      // Infinity zoom in.
      this.camera.fov += event.deltaY*0.005;
      if(this.camera.fov<=0.1) this.camera.fov=0.1;
      //console.log(this.camera.fov);
      this.camera.updateProjectionMatrix();
    })
    
    this.gui = new GUI();
    this.maxRadius = 1;
    this.maxLineWidth = 50;
    const saveBlob = (function(){
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        return function saveData(blob, fileName) {
           const url = window.URL.createObjectURL(blob);
           a.href = url;
           a.download = fileName;
           a.click();
        };
    }());
    const expparam = {
      filename: 'threejsviewer',
      format: 'png',
      export : function() {
        let exporter;
        switch(expparam.format){
          case 'png':
            this.animate(false);
            this.renderer.domElement.toBlob(blob =>{
              saveBlob(blob, expparam.filename+'.'+expparam.format);
            });
            break;
          case 'drc':
            exporter = new DRACOExporter();
            const drcData = exporter.parse(this.scene, {exportColor:true});
            saveBlob(new Blob([drcData], {
              type: 'application/octet-stream'
            }), expparam.filename+'.'+expparam.format);
            break;
          case 'svg':
            var rendererSVG = new SVGRenderer();
            rendererSVG.setSize(this.width, this.height);
            rendererSVG.setClearColor( this.background, this.bckalpha );
            rendererSVG.render(this.scene, this.camera);
            var XMLS = new XMLSerializer();
            var svgData = XMLS.serializeToString(rendererSVG.domElement);
            var preface = '<?xml version="1.0" standalone="no"?>\r\n';
            var blob = new Blob([preface, svgData], {
              type: "image/svg+xml;charset=utf-8"
            });
            saveBlob(blob, expparam.filename+'.'+expparam.format);
            break;
          case 'gltf':
            exporter = new GLTFExporter();
            exporter.parse(
              this.scene,
              function(gltf){
                var blob = new Blob([JSON.stringify(gltf)], {
                  type: 'text/plain'
                });
                saveBlob(blob, expparam.filename+'.'+expparam.format);
              },
              function(error){
                console.log(error);
              }
            )
            break;
          case 'ply':
            exporter = new PLYExporter();
            const plyData = exporter.parse(this.scene);
            saveBlob(new Blob([plyData], {
              type: 'text/plain'
            }), expparam.filename+'.'+expparam.format);
            break;
          case 'stl':
            exporter = new STLExporter();
            const stlData = exporter.parse( this.scene );
            saveBlob(new Blob([stlData], {
              type: 'text/plain'
            }), expparam.filename+'.'+expparam.format);
            break;
          default:
            alert('not support yet!');
        }
      }.bind(this)
    };
    this.gui.add(expparam, 'filename').onChange(
      val => expparam.filename = val
    );
    var availableFormat = ['drc', 'gltf', 'ply', 'png', 'stl', 'svg'];
    var supportFormat = ['png'];
    this.gui.add(expparam, 'format', supportFormat).onChange(
      val => expparam.format = val
    );
    this.gui.add(expparam, 'export');
    this.layer = {
      'tick_labels':1,
      'gene_labels':2
    };
    const labelLayer = {
      'Toggle tick labels': function(){
        this.camera.layers.toggle(this.layer.tick_labels);
      }.bind(this),
      'Toggle gene labels': function(){
        this.camera.layers.toggle(this.layer.gene_labels);
      }.bind(this)
    };
    this.gui.add(labelLayer, 'Toggle tick labels');
    this.gui.add(labelLayer, 'Toggle gene labels');
  }
  
  getLayer = function(tag){
      return(this.layer[tag]);
  };
    
  create_plot(x){
    //console.log(x);
    //const twoPi = Math.PI * 2;
    //x is a named array
    if('background' in x){
      //Separate RGB values between 0 and 1
      this.background = new THREE.Color(
        x.background.r,
        x.background.g,
        x.background.b
      );
      this.bckalpha = x.background.alpha;
    }
    if('maxRadius' in x){
      this.maxRadius = x.maxRadius;
    }
    if('maxLineWidth' in x){
      this.maxLineWidth = x.maxLineWidth;
    }
    function updateGroupGeometry(mesh, geometry){
            mesh.geometry.dispose();
            mesh.geometry = geometry;
        }
    function initNewMesh(obj, ele, offset={x:0,y:0,z:0}){
      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();
      for ( let i = 0; i < obj.count; i ++ ) {
        matrix.setPosition( ele.positions[i*3] + offset.x,
                            ele.positions[i*3+1] + offset.y,
                            ele.positions[i*3+2] + offset.z );
        obj.setMatrixAt( i, matrix );
        if(ele.colors.length==ele.positions.length){
          obj.setColorAt( i, color.setRGB(
                ele.colors[i*3],
                ele.colors[i*3+1],
                ele.colors[i*3+2]
              ) );
        }else{//same color for alll elements
          obj.setColorAt( i, color.setRGB(
                ele.colors[0],
                ele.colors[1],
                ele.colors[2]
              ) );
        }
      }
    }
    // each element 
    for(var k in x){
      if(k!='background' && k!='maxRadius' && k!='maxLineWidth'){
        let ele = x[k];
        const param = {
          'size': 0.08,
          'radius': 0.08,
          'radiusTop': 0.08,
          'radiusBottom': 0.08,
          'tube': 0.08,
          'width':0.08,
          'height':0.08,
          'depth':0.08,
          'opacity':1,
          'transparent':true
        };
        const len = ele.positions.length/3;
        const folder = this.gui.addFolder(ele.type+' '+k);
        let geometry = new THREE.BufferGeometry();
        let obj = new THREE.InstancedMesh();
        let material = new THREE.MeshBasicMaterial( {
              color: 0xffffff,
              opacity: 1,
              transparent: true
            } );
        switch(ele.type){
          case 'arrow':
            const hex = new THREE.Color(
                ele.colors[0],
                ele.colors[1],
                ele.colors[2]);
            obj = new THREE.ArrowHelper(
              new THREE.Vector3(
                ele.positions[3],
                ele.positions[4],
                ele.positions[5]
                ), // next three elements are end x,y,z
              new THREE.Vector3(
                ele.positions[0],
                ele.positions[1],
                ele.positions[2]
              ), // first three elements are start x,y,z
              ele.size, '#'+hex.getHexString(), ele.headLength, ele.headWidth);
            
            break;
          case 'line':// Line2 ( LineGeometry, LineMaterial )
            param.size = ele.size;
            geometry = new LineGeometry();
            geometry.setPositions( ele.positions );
            if(ele.colors.length!=ele.positions.length){
              // single colors
              for(var i=1; i<len; i++){
                ele.colors.push(ele.colors[0]);
                ele.colors.push(ele.colors[1]);
                ele.colors.push(ele.colors[2]); 
              }
            }
            geometry.setColors( ele.colors );
            material = new LineMaterial( {
              color: 0xffffff,
              linewidth: ele.size, // in world units with size attenuation, pixels otherwise
              vertexColors: true,
              dashed: false,
              alphaToCoverage: false,
              opacity: 1,
              transparent: true
            } );
            obj = new Line2( geometry, material );
            obj.computeLineDistances();
            obj.scale.set( 1, 1, 1 );
            folder.add(param, 'size', 0, this.maxLineWidth).onChange( function( val) {
              material.linewidth = val;
            });
            break;
          case 'segment':
            param.size = ele.size;
            geometry = new LineSegmentsGeometry();
            geometry.setPositions( ele.positions );
            if(ele.colors.length!=ele.positions.length){
              // single colors
              for(var i=1; i<len; i++){
                ele.colors.push(ele.colors[0]);
                ele.colors.push(ele.colors[1]);
                ele.colors.push(ele.colors[2]); 
              }
            }
            geometry.setColors( ele.colors );
            material = new LineMaterial({ 
              color: 0xffffff,
              linewidth: ele.size,
              vertexColors: true});
            obj = new LineSegments2(geometry, material);
            folder.add(param, 'size', 0, this.maxLineWidth).onChange( function( val){
              material.linewidth = val;
            });
            break;
          case 'sphere':
            param.radius = ele.radius;
            const spheredata = {
              radius: ele.radius,
              widthSegments: 32, //3-64
              heightSegments: 16//2-32
            };
            geometry = new THREE.SphereGeometry(
              spheredata.radius, spheredata.widthSegments, spheredata.heightSegments);
            obj = new THREE.InstancedMesh( geometry, material, len );
            initNewMesh(obj, ele);
            folder.add(param, 'radius', 0, this.maxRadius).onChange( function( val) {
              spheredata.radius = val;
              updateGroupGeometry(obj, new THREE.SphereGeometry(
                spheredata.radius,
                spheredata.widthSegments,
                spheredata.heightSegments));
            });
            break;
          case 'box':
            param.width = ele.width;
            param.height = ele.height;
            param.depth = ele.depth;
            const boxdata = {
              width : ele.width,
              height : ele.height,
              depth : ele.depth
            }
            geometry = new THREE.BoxGeometry(
              boxdata.width, 
              boxdata.height,
              boxdata.depth);
            obj = new THREE.InstancedMesh( geometry, material, len );
            initNewMesh(obj, ele);
            function updateBoxGeometry(){
              updateGroupGeometry(obj, new THREE.BoxGeometry(
                boxdata.width, 
                boxdata.height,
                boxdata.depth));
            }
            folder.add(param, 'width', 0, this.maxRadius).onChange( function( val) {
              boxdata.width = val;
              updateBoxGeometry();
            });
            folder.add(param, 'height', 0, this.maxRadius).onChange( function( val) {
              boxdata.height = val;
              updateBoxGeometry();
            });
            folder.add(param, 'depth', 0, this.maxRadius).onChange( function( val) {
              boxdata.depth = val;
              updateBoxGeometry();
            });
            break;
          case 'capsule':
            param.radius = ele.radius;
            param.height = ele.height;
            const capsuledata = {
              radius : ele.radius,
              height : ele.height
            }
            geometry = new THREE.CapsuleGeometry(
              capsuledata.radius,
              capsuledata.height
            );
            obj = new THREE.InstancedMesh( geometry, material, len);
            initNewMesh(obj, ele);
            function updateCapsuleGeometry(){
              updateGroupGeometry(obj, new THREE.CapsuleGeometry(
                capsuledata.radius,
                capsuledata.size
              ))
            }
            folder.add(param, 'radius', 0, this.maxRadius).onChange( function(val) {
              capsuledata.radius = val;
              updateCapsuleGeometry()
            });
            folder.add(param, 'height', 0, this.maxRadius).onChange( function(val) {
              capsuledata.height = val;
              updateCapsuleGeometry()
            });
            break;
          case 'cone':
            param.radius = ele.radius;
            param.height = ele.height;
            const conedata = {
              radius: ele.radius,
              height: ele.height
            }
            geometry = new THREE.ConeGeometry(
              conedata.radius,
              conedata.height
            );
            obj = new THREE.InstancedMesh( geometry, material, len);
            initNewMesh(obj, ele);
            function updateConeGeometry(){
              updateGroupGeometry(obj, new THREE.ConeGeometry(
                conedata.radius,
                conedata.height
              ));
            }
            folder.add(param, 'radius', 0, this.maxRadius).onChange( function(val) {
              conedata.radius = val;
              updateConeGeometry()
            });
            folder.add(param, 'height', 0, this.maxRadius).onChange( function(val) {
              conedata.height = val;
              updateConeGeometry()
            });
            break;
          case 'cylinder':
            param.radiusTop = ele.radiusTop;
            param.radiusBottom = ele.radiusBottom;
            param.height = ele.height;
            const cylinderdata = {
              radiusTop: ele.radiusTop,
              radiusBottom: ele.radiusBottom,
              height: ele.height
            }
            geometry = new THREE.CylinderGeometry(
              cylinderdata.radiusTop,
              cylinderdata.radiusBottom,
              cylinderdata.height
            )
            obj = new THREE.InstancedMesh( geometry, material, len);
            initNewMesh(obj, ele);
            function updateCylinderGeometry(){
              updateGroupGeometry(obj, new THREE.CylinderGeometry(
              cylinderdata.radiusTop,
              cylinderdata.radiusBottom,
              cylinderdata.height
              ))
            }
            folder.add(param, 'radiusTop', 0, this.maxRadius).onChange( function(val) {
              cylinderdata.radiusTop = val;
              updateCylinderGeometry()
            });
            folder.add(param, 'radiusBottom', 0, this.maxRadius).onChange( function(val) {
              cylinderdata.radiusBottom = val;
              updateCylinderGeometry()
            });
            folder.add(param, 'height', 0, this.maxRadius).onChange( function(val) {
              cylinderdata.height = val;
              updateCylinderGeometry()
            });
            break;
          case 'dodecahedron':
            param.radius = ele.radius;
            const dodecahedrondata = {
              radius: ele.radius
            };
            geometry = new THREE.DodecahedronGeometry(
              dodecahedrondata.radius);
            obj = new THREE.InstancedMesh( geometry, material, len );
            initNewMesh(obj, ele);
            folder.add(param, 'radius', 0, this.maxRadius).onChange( function( val) {
              dodecahedrondata.radius = val;
              updateGroupGeometry(obj, new THREE.DodecahedronGeometry(
                dodecahedrondata.radius));
            });
            break;
          case 'icosahedron':
            param.radius = ele.radius;
            const icosahedrondata = {
              radius: ele.radius
            };
            geometry = new THREE.IcosahedronGeometry(
              icosahedrondata.radius);
            obj = new THREE.InstancedMesh( geometry, material, len );
            initNewMesh(obj, ele);
            folder.add(param, 'radius', 0, this.maxRadius).onChange( function( val) {
              icosahedrondata.radius = val;
              updateGroupGeometry(obj, new THREE.IcosahedronGeometry(
                icosahedrondata.radius));
            });
            break;
          case 'label'://ask to modify the CSS2DRenderer.js at the line
                      //const visible = ( _vector.z >= - 1 && _vector.z <= 1 ) && ( object.layers.test( camera.layers ) === true );
                      // to const visible = object.layers.test( camera.layers ) === true;
                      // becase the _vector.x,y,z always is null. no global viewport.
            let labelDiv = document.createElement('div');
            let css2obj = new CSS2DObject();
            const color = new THREE.Color();
            labelDiv.style.backgroundColor = 'transparent';
            for(var i=0; i<ele.label.length; i++){
              labelDiv.textContent = ele.label;
              if(ele.colors.length==ele.positions.length){
                labelDiv.style.color='#'+color.setRGB(
                      ele.colors[i*3],
                      ele.colors[i*3+1],
                      ele.colors[i*3+2]
                    ).getHexString();
              }else{//same color for alll elements
                labelDiv.style.color='#'+color.setRGB(
                      ele.colors[0],
                      ele.colors[1],
                      ele.colors[2]
                    ).getHexString();
              }
              css2obj = new CSS2DObject(labelDiv);
              css2obj.position.set(
                ele.positions[i*3],
                ele.positions[i*3+1],
                ele.positions[i*3+2]);
              css2obj.center.set(0.5,0.5);
              css2obj.layers.set(this.getLayer(ele.tag));
              obj.add(css2obj);
            }
            obj.layers.enableAll();
            break;
          case 'octahedron':
            param.radius = ele.radius;
            const octahedrondata = {
              radius: ele.radius
            };
            geometry = new THREE.OctahedronGeometry(
              octahedrondata.radius);
            obj = new THREE.InstancedMesh( geometry, material, len );
            initNewMesh(obj, ele);
            folder.add(param, 'radius', 0, this.maxRadius).onChange( function( val) {
              octahedrondata.radius = val;
              updateGroupGeometry(obj, new THREE.OctahedronGeometry(
                octahedrondata.radius));
            });
            break;
          case 'tetrahedron':
            param.radius = ele.radius;
            const tetrahedrondata = {
              radius: ele.radius
            };
            geometry = new THREE.TetrahedronGeometry(
              tetrahedrondata.radius);
            obj = new THREE.InstancedMesh( geometry, material, len );
            initNewMesh(obj, ele);
            folder.add(param, 'radius', 0, this.maxRadius).onChange( function( val) {
              tetrahedrondata.radius = val;
              updateGroupGeometry(obj, new THREE.TetrahedronGeometry(
                tetrahedrondata.radius));
            });
            break;
          case 'text':
            param.size = ele.size;
            param.depth = ele.depth;
            const textdata = {
              font: new Font(JSON.parse(ele.font)),
              size: ele.size,
              depth: ele.depth
            }
            geometry = new TextGeometry(ele.label, {
                font: textdata.font,
                size: textdata.size,
                depth: textdata.depth
            });
              geometry.computeBoundingBox();
              const centerOffset = {
                x: - 0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x ),
                y: - 0.5 * (geometry.boundingBox.max.y - geometry.boundingBox.min.y ),
                z: - 0.5 * (geometry.boundingBox.max.z - geometry.boundingBox.min.z )
                };
              obj = new THREE.InstancedMesh( geometry, material, len );
              initNewMesh(obj, ele, centerOffset);
              function updateTextGeometry(){
                updateGroupGeometry(obj, new TextGeometry(ele.label, {
                    font: textdata.font,
                    size: textdata.size,
                    depth: textdata.depth
                }))
              }
              folder.add(param, 'size', 0, this.maxRadius).onChange( function(val) {
                textdata.size = val;
                updateTextGeometry()
              });
              folder.add(param, 'depth', 0, this.maxRadius).onChange( function(val) {
                textdata.depth = val;
                updateTextGeometry()
              });
            break;
          case 'torus':
            param.radius = ele.radius;
            param.tube = ele.tube;
            const torusdata = {
              radius: ele.radius,
              tube: ele.tube
            }
            geometry = new THREE.TorusGeometry(
              torusdata.radius,
              torusdata.tube
            )
            obj = new THREE.InstancedMesh( geometry, material, len);
            initNewMesh(obj, ele);
            function updateTorusGeometry(){
              updateGroupGeometry(obj, new THREE.TorusGeometry(
                torusdata.radius,
                torusdata.tube
              ))
            }
            folder.add(param, 'radius', 0, this.maxRadius).onChange( function(val) {
              torusdata.radius = val;
              updateTorusGeometry()
            });
            folder.add(param, 'tube', 0, this.maxRadius).onChange( function(val) {
              torusdata.tube = val;
              updateTorusGeometry()
            });
            break;
          default:
        }
        folder.add(param, 'opacity', 0, this.maxRadius).onChange( function( val ){
          material.opacity = val;
        })
        folder.add(param, 'transparent').onChange( function( val ){
          material.transparent = val;
        })
        folder.close();
        this.materials.push(material);
        this.objects.push(obj);
        this.scene.add(obj);
      }
    }
    this.gui.close();
  }
  
  onWindowResize(width, height){
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.width = width;
    this.height = height;
    this.renderer.setSize( width, height );
    this.labelRenderer.setSize( width, height );
    
    this.insetWidth = height / 4; // square
    this.insetHeight = height / 4;
    
    this.camera2.aspect = this.insetWidth / this.insetHeight;
    this.camera2.updateProjectionMatrix();
  }
  
  animate(inset=true){
    // main scene
    this.renderer.setClearColor( this.background, this.bckalpha );
    this.renderer.setViewport( 0, 0, this.width, this.height );
    this.controls.update();
    //controls
    //this.gpuPanel.startQuery();
    this.renderer.render( this.scene, this.camera );
    this.labelRenderer.render(this.scene, this.camera );
    //this.gpuPanel.endQuery();
    
    // inset scene
    if(inset){
      this.renderer.setClearColor( 0x222222, 1 );
      this.renderer.clearDepth(); // important!
      this.renderer.setScissorTest( true );
      this.renderer.setScissor( 20, 20, this.insetWidth, this.insetHeight );
      this.renderer.setViewport( 20, 20, this.insetWidth, this.insetHeight );
      this.camera2.position.copy( this.camera.position );
      this.camera2.quaternion.copy( this.camera.quaternion );
      this.renderer.render( this.scene, this.camera2 );
      this.renderer.setScissorTest( false );
    }
    
    // stats
    //this.stats.update();
  }
};

export { tjViewer };
