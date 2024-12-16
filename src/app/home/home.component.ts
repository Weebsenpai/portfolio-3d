import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer, GLTFLoader, RGBELoader, DRACOLoader } from 'three-stdlib';
import { OrbitControls } from 'three-stdlib';
import { IFRAME_PADDING, IFRAME_SIZE, SCREEN_SIZE } from 'src/assets/data/constant';
import gsap from 'gsap';





@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit{
  @ViewChild('rendererDiv') rendererContainer!: ElementRef;
  @ViewChild('cssRendererDiv') cssRenderConstainer!: ElementRef;
  scene!: THREE.Scene;
  renderer!: THREE.WebGLRenderer;
  camera!: THREE.PerspectiveCamera;
  light!: THREE.DirectionalLight;
  loader!: GLTFLoader;
  control!: OrbitControls;
  monitor!: THREE.Mesh;
  rbgeLoader!: RGBELoader;
  dracoLoader!: DRACOLoader;
  cssScene!: THREE.Scene;
  cssRenderer!: CSS3DRenderer;
  areaLight!: THREE.RectAreaLight
  raycaster!: THREE.Raycaster;
  model!: THREE.Group;
  marshalSpeaker = new THREE.Object3D();
  spotLight !: THREE.SpotLight
  originalCameraPosition = new THREE.Vector3(1,1.3,-0.25);
  originalLookAtPosition = new THREE.Vector3(-0.2,1,-2);
  monitorTrgtPos = new THREE.Vector3(-1.0,1.27,-3.0);
  monitorLookatPos = new THREE.Vector3(-1.2,1.25,-3.0);
  constructor(){

  }

  ngAfterViewInit(): void {
    this.createRoom();
  }

  ngOnInit(): void {
  }

  createRoom(){
    this.scene = new THREE.Scene();
    this.cssScene = new THREE.Scene();
    this.rbgeLoader = new RGBELoader();
    this.raycaster = new THREE.Raycaster();

    this.rbgeLoader.load('assets/images/env_texture.hdr',(hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.background = hdrTexture;
    });

    this.camera = new THREE.PerspectiveCamera(75,innerWidth/innerHeight, 0.01 , 1000);
    this.camera.position.set(this.originalCameraPosition.x,this.originalCameraPosition.y,this.originalCameraPosition.z);
    this.camera.rotation.y = Math.PI / 5;
    this.camera.lookAt(this.originalLookAtPosition.x,this.originalLookAtPosition.y,this.originalLookAtPosition.z);

    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.zIndex = '2';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;


    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(innerWidth,innerHeight);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0px';
    this.cssRenderConstainer.nativeElement.appendChild(this.cssRenderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth/2, window.innerHeight/2);
    });

    this.light = new THREE.DirectionalLight(0xffffff,4);
    this.light.position.set(10,4,10);
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 2048;
    this.light.shadow.mapSize.height = 2048;
    this.light.shadow.radius = 4;
    this.scene.add(this.light);

    const ambientLight = new THREE.AmbientLight(0xffffff,0.3);
    this.scene.add(ambientLight);

    this.control = new OrbitControls(this.camera,this.renderer.domElement);
    this.control.target.set(-0.2,1,-2);
    this.control.update();

    // const spherical = new THREE.Spherical();
    // spherical.setFromVector3(this.camera.position.clone().sub(this.control.target));
    // const initialAzimuth = spherical.theta; // Horizontal rotation
    // const initialPolar = spherical.phi;
    // const deltaLR = THREE.MathUtils.degToRad(2);
    // const deltaUD = THREE.MathUtils.degToRad(1);
    // this.control.minAzimuthAngle = initialAzimuth - deltaLR;
    // this.control.maxAzimuthAngle = initialAzimuth + deltaLR; 
    // this.control.minPolarAngle = initialPolar - deltaUD; 
    // this.control.maxPolarAngle = initialPolar + deltaUD;
    // this.control.minDistance = 1; 
    // this.control.maxDistance = 2;
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('assets/draco/');
    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(this.dracoLoader)
    this.loader.load('assets/models/myroom.glb',(gltf) => {
      console.log(gltf.scene);
      this.model = gltf.scene;
      this.model.traverse((child) => {
        child.receiveShadow = true;
        child.castShadow = true;
        const targetObj = new THREE.Object3D();
        targetObj.position.set(-1.4,0.2,-0.66);
        this.scene.add(targetObj);
        if(child.name == "IKEA_ARSTID_Wall_Lamp"){
          console.log('lamp pos -> ', child.position);
          this.spotLight = new THREE.SpotLight(0xff9f33,4);
          this.spotLight.position.copy(child.position);
          this.spotLight.angle = Math.PI/12;
          this.spotLight.target = targetObj;
          //this.scene.add(this.spotLight);
        }
      })
      this.monitor = this.model.getObjectByName("Samsung_24_Inch_Monitor") as THREE.Mesh;
      if(this.monitor) this.loadIframeToMonitor();
      this.scene.add(gltf.scene);
    });

    this.animateRoom();
  }

  loadIframeToMonitor(){
    const display = this.monitor.getObjectByName("Plane") as THREE.Mesh;
    console.log(display);
    if(display){
      display.material = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 1})
      const container = document.createElement('div');
      container.style.width = '1920px';
      container.style.height = '1080px';
      container.style.opacity = '1';
      container.style.background = '#1d2e2f';
      const iframe = document.createElement('iframe');
      iframe.onload = () => {
        if (iframe.contentWindow) {
            window.addEventListener('message', (event) => {
                var evt = new CustomEvent(event.data.type, {
                    bubbles: true,
                    cancelable: false,
                });

                // @ts-ignore
                evt.inComputer = true;
                if (event.data.type === 'mousemove') {
                    var clRect = iframe.getBoundingClientRect();
                    const { top, left, width, height } = clRect;
                    const widthRatio = width / IFRAME_SIZE.w;
                    const heightRatio = height / IFRAME_SIZE.h;

                    // @ts-ignore
                    evt.clientX = Math.round(
                        event.data.clientX * widthRatio + left
                    );
                    //@ts-ignore
                    evt.clientY = Math.round(
                        event.data.clientY * heightRatio + top
                    );
                } else if (event.data.type === 'keydown') {
                    // @ts-ignore
                    evt.key = event.data.key;
                } else if (event.data.type === 'keyup') {
                    // @ts-ignore
                    evt.key = event.data.key;
                }

                iframe.dispatchEvent(evt);
            });
        }
    };

    // Set iframe attributes
    // PROD
    iframe.src = 'https://folio-56367.web.app';
    /**
     * Use dev server is query params are present
     *
     * Warning: This will not work unless the dev server is running on localhost:3000
     * Also running the dev server causes browsers to freak out over unsecure connections
     * in the iframe, so it will flag a ton of issues.
     */
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('dev')) {
        iframe.src = 'http://localhost:3000/';
    }
    iframe.style.width = '1920px';
    iframe.style.height = '1080px';
    iframe.style.padding = IFRAME_PADDING + 'px';
    iframe.style.boxSizing = 'border-box';
    iframe.style.opacity = '1';
    iframe.style.overflow = 'hidden';
    iframe.className = 'jitter';
    iframe.id = 'computer-screen';
    iframe.frameBorder = '0';
    iframe.title = 'Mohit Chouhan';

    // Add iframe to container
    container.appendChild(iframe);
    const object = new CSS3DObject(container);
    object.scale.set(0.00045,0.00045,0.00045);
    object.rotation.y = Math.PI/2;
    object.position.set(-1.563,1.27,-2.9);
    this.cssScene.add(object);

    const material = new THREE.MeshLambertMaterial();
    material.side = THREE.DoubleSide;
    material.opacity = 0;
    material.transparent = true;
    material.blending = THREE.NoBlending;

    const geometry = new THREE.PlaneGeometry(1920,1080);
    const monitorMesh = new THREE.Mesh(geometry, material);

     // Copy the position, rotation and scale of the CSS plane to the GL plane
    monitorMesh.position.copy(object.position);
    monitorMesh.rotation.copy(object.rotation);
    monitorMesh.scale.copy(object.scale);
    this.scene.add(monitorMesh);

    window.addEventListener('click',(event)=>{

      const pointer = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );
      this.raycaster.setFromCamera(pointer, this.camera);

      console.log(this.monitor.children);
      const intersectObj = this.raycaster.intersectObjects(this.monitor.children,true)
      console.log(intersectObj);
      if(intersectObj.length > 0){
        intersectObj.forEach((item)=>{
          if(item.object.name === "Plane"){
            // this.control.minAzimuthAngle = -Infinity;
            // this.control.maxAzimuthAngle = Infinity;
            // this.control.minPolarAngle = 0;
            // this.control.maxPolarAngle = Math.PI;
            gsap.to(this.camera.position,{
              x: this.monitorTrgtPos.x,
              y: this.monitorTrgtPos.y,
              z: this.monitorTrgtPos.z,
              onUpdate: ()=>{
                this.camera.lookAt(this.monitorLookatPos.x,this.monitorLookatPos.y,this.monitorLookatPos.z);
              },
              onComplete : () =>{
                this.control.target.set(this.monitorLookatPos.x,this.monitorLookatPos.y,this.monitorLookatPos.z);
                this.control.update();
                this.renderer.domElement.style.pointerEvents = 'none';
              }
            });
          }
        })
      }
      else if(intersectObj.length <=0){
        gsap.to(this.camera.position,{
          x: this.originalCameraPosition.x,
          y: this.originalCameraPosition.y,
          z: this.originalCameraPosition.z,
          duration: 2,
          ease: 'power2.inOut',
          onUpdate: ()=>{
            this.camera.lookAt(this.monitorLookatPos.x,0.8,-2.9);
          },
          onComplete: ()=>{
            this.camera.lookAt(this.originalLookAtPosition.x,this.originalLookAtPosition.y,this.originalLookAtPosition.z);
            this.control.target.set(this.originalLookAtPosition.x,this.originalLookAtPosition.y,this.originalLookAtPosition.z);
            this.control.update();
            this.renderer.domElement.style.pointerEvents = 'auto';
          }
        });
      }
    });
    }
  }
  
  animateRoom(){
    const animate = () => {
      requestAnimationFrame(animate);
      this.renderer.render(this.scene, this.camera);
      this.cssRenderer.render(this.cssScene,this.camera);
    };
    animate();
  }
}
