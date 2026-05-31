/**
 * 3D Hand Math Visualization - Main Application
 * 
 * This application creates a 3D scene with realistic hand models
 * for mathematical calculations using finger positions.
 */

class HandMathApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.handController = null;
        this.animationId = null;
        // Logging level (window.HANDMATH_LOG_LEVEL: 'silent'|'error'|'warn'|'info'|'debug')
        const _lvl = (typeof window !== 'undefined' && window.HANDMATH_LOG_LEVEL) || 'warn';
        const _map = { silent:0, error:1, warn:2, info:3, debug:4 };
        this._logLevelNum = _map[_lvl] ?? 2;
        
        // Mathematical calculation system
        this.calculator = new HandMathCalculator();
        
        // Scene objects
        this.leftHand = null;
        this.rightHand = null;
        this.lights = [];
        
        // Skin tone service (caches materials and applies color)
        this.skinToneService = null;
        
        // Controls
        this.controls = null;
        this.isWireframe = false;
        
        // UI Elements
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.canvas = document.getElementById('three-canvas');
        this.sceneContainer = document.getElementById('scene-container');
        // Strict GLTF mode: do not fallback to placeholder hands
        this.strictGLTF = (typeof window !== 'undefined' && !!window.HANDMATH_STRICT_GLTF);
        
        // Initialize the application
        this.init();
    }
    
    /**
     * Initialize the 3D scene and all components
     */
    async init() {
        try {
            this.setupScene();
            this.setupCamera();
            this.setupRenderer();
            this.setupLighting();
        this.setupControls();
        await this.loadHandModels();
        // Initialize skin tone service after hands are present
        if (typeof window !== 'undefined' && window.SkinToneService) {
            this.skinToneService = new window.SkinToneService(this);
            this.skinToneService.init();
        }
        this.setupDebugFingerAnimator();
        this._debugFinger = { active: false, samples: [], baseline: null };
        this.setupEventListeners();
        this.hideLoading();
        this.animate();
            
            console.log('3D Hand Math App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError(window.i18n.t('error.loadFailed'));
        }
    }
    
    /**
     * Set up the Three.js scene
     */
    setupScene() {
        this.scene = new THREE.Scene();
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const color = isDark ? 0x090d16 : 0xf8fafc;
        this.scene.background = new THREE.Color(color);
        
        // Add fog for depth perception
        this.scene.fog = new THREE.Fog(color, 10, 50);
    }

    /**
     * Update Three.js scene background color according to body data-theme attribute
     */
    updateSceneBackgroundForTheme() {
        if (!this.scene) return;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const color = isDark ? 0x090d16 : 0xf8fafc;
        this.scene.background.setHex(color);
        if (this.scene.fog) {
            this.scene.fog.color.setHex(color);
        }
    }

    /**
     * Public API: Set skin color (hex) for both hands via SkinToneService
     * Example: handMathApp.setSkinColor('#c79a6b')
     */
    setSkinColor(hex) {
        if (!this.skinToneService) return false;
        const ok = this.skinToneService.setColor(hex);
        // If applying default color, attempt to restore original albedo maps
        if (ok && this.skinToneService.defaultHex && SkinToneService._normalizeHex(hex) === SkinToneService._normalizeHex(this.skinToneService.defaultHex)) {
            this.skinToneService.restoreOriginalMapsIfDefault();
        }
        return ok;
    }
    
    /**
     * Set up the camera for fixed optimal view - both hands visible and appropriately sized
     */
    setupCamera() {
        const aspect = this.sceneContainer.clientWidth / this.sceneContainer.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        // Optimal camera position for viewing both hands simultaneously
        this.camera.position.set(0, 0.2, 3.5);
        this.camera.lookAt(0, 0, 0);
    }
    
    /**
     * Set up the WebGL renderer with enhanced settings for realistic hands
     */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        
        this.renderer.setSize(
            this.sceneContainer.clientWidth,
            this.sceneContainer.clientHeight
        );
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Enhanced shadow settings for realistic hands
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = true;
        
        // Enhanced color and lighting settings
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        
        // Performance optimizations
        this.renderer.sortObjects = true;
        // Remove the deprecated useLegacyLights line for Three.js r128
        // this.renderer.useLegacyLights = false;
    }
    
    /**
     * Set up realistic lighting for the scene
     */
    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        // Main directional light (sun-like)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
        
        // Fill light from the opposite side
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);
        this.lights.push(fillLight);
        
        // Rim light for edge definition
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
        rimLight.position.set(0, 5, -10);
        this.scene.add(rimLight);
        this.lights.push(rimLight);
    }
    
    /**
     * Set up simplified camera controls
     */
    setupControls() {
        // Simplified controls - minimal interaction
        this.controls = {
            isRotating: false,
            previousMousePosition: { x: 0, y: 0 },
            rotationSpeed: 0.002, // Slower rotation
            zoomSpeed: 0.05,      // Slower zoom
            minDistance: 2.5,
            maxDistance: 6        // Limited zoom range
        };
    }
    
    /**
     * Load and create hand models
     */
    async loadHandModels() {
        try {
            // Load GLTF hand models
            await this.loadGLTFHandModels();
            
            // Initialize hand controller
            this.handController = new HandController(this.leftHand, this.rightHand);
            // Apply user's splay preset for a correct back-hand view at full extension
            const presetSplay = {
                left:  { thumb: 25, index: 25, middle: -25, ring: -25, pinky: -25 },
                right: { thumb: 25, index: 25, middle: -25, ring: -25, pinky: -25 }
            };
            this.handController.setBulkSplay(presetSplay);
            
            // CRITICAL: Force hands to closed fist state to override GLTF initial pose
            console.log('👊 Forcing hands to closed fist state to override GLTF...');
            this.handController.forceAllFingersToClosedFist();
        } catch (error) {
            console.error('Failed to load hand models:', error);
            if (this.strictGLTF) {
                // In strict mode, surface error instead of using placeholders
                throw error;
            }
            // Fallback to placeholder hands (non‑strict only)
            await this.createPlaceholderHands();
            this.handController = new HandController(this.leftHand, this.rightHand);
        }
    }
    
    /**
     * Load GLTF hand models using proven separate loading pattern from phase1_orientation_test.html
     */
    async loadGLTFHandModels() {
        return new Promise((resolve, reject) => {
            if (typeof THREE.GLTFLoader === 'undefined') {
                console.warn('GLTFLoader not available, will use procedural hands');
                reject(new Error('GLTFLoader not available'));
                return;
            }
            
            const loader = new THREE.GLTFLoader();
            let loadedCount = 0;
            this._log('info','GLTF Loader created successfully - using proven separate loading pattern');
            
            // Load left hand model (separate call)
            this._log('info','Loading left hand model from: assets/models/hand_left.gltf');
            loader.load('assets/models/hand_left.gltf', (gltf) => {
                this._log('info','🎉 Left hand GLTF loaded successfully:', gltf);
                try {
                    this.leftHand = this.setupHandModel(gltf, 'left');
                    this.scene.add(this.leftHand);
                    this._log('info','✅ Left hand added to scene successfully');
                    loadedCount++;
                    if (loadedCount === 2) {
                        this.addIdleAnimations();
                        this._log('info','🚀 Both hand models loaded successfully');
                        
                        // Force optimal positioning after both hands loaded
                        setTimeout(() => {
                            this.applyOptimalTask1Settings();
                            this.verifyTask1Compliance();
                            // DEBUG ROTATION CONTROLS COMMENTED OUT - USING HARDCODED VALUES
                            // console.log('🎛️ Initializing slider rotations after hand loading...');
                            // if (typeof this.applySliderRotations === 'function') {
                            //     this.applySliderRotations();
                            // }
                        }, 200);
                        
                        resolve();
                    }
                } catch (setupError) {
                    console.error('💥 Error setting up left hand:', setupError);
                    reject(setupError);
                }
            }, (progress) => {
                this._log('info',`Left hand loading progress: ${(progress.loaded/progress.total*100).toFixed(1)}%`);
            }, (error) => {
                console.error('💥 Error loading left hand:', error);
                reject(error);
            });
            
            // Load right hand model (separate call)
            this._log('info','Loading right hand model from: assets/models/hand_right.gltf');
            loader.load('assets/models/hand_right.gltf', (gltf) => {
                this._log('info','🎉 Right hand GLTF loaded successfully:', gltf);
                try {
                    this.rightHand = this.setupHandModel(gltf, 'right');
                    this.scene.add(this.rightHand);
                    this._log('info','✅ Right hand added to scene successfully');
                    loadedCount++;
                    if (loadedCount === 2) {
                        this.addIdleAnimations();
                        this._log('info','🚀 Both hand models loaded successfully');
                        
                        // Force optimal positioning after both hands loaded
                        setTimeout(() => {
                            this.applyOptimalTask1Settings();
                            this.verifyTask1Compliance();
                            // DEBUG ROTATION CONTROLS COMMENTED OUT - USING HARDCODED VALUES
                            // console.log('🎛️ Initializing slider rotations after hand loading...');
                            // if (typeof this.applySliderRotations === 'function') {
                            //     this.applySliderRotations();
                            // }
                        }, 200);
                        
                        resolve();
                    }
                } catch (setupError) {
                    console.error('💥 Error setting up right hand:', setupError);
                    reject(setupError);
                }
            }, (progress) => {
                this._log('info',`Right hand loading progress: ${(progress.loaded/progress.total*100).toFixed(1)}%`);
            }, (error) => {
                console.error('💥 Error loading right hand:', error);
                reject(error);
            });
        });
    }
    
    /**
     * Setup hand model using optimal positioning for both hands to be visible and properly sized
     */
    setupHandModel(gltf, side) {
        const model = gltf.scene;

        // Task 1 compliance (per specs/tasks.md):
        // Left:  X=-90°, Y=180°, Z=+90°
        // Right: X=-90°, Y=180°, Z=-90°
        if (side === 'left') {
            model.position.set(-0.7, -0.2, 0);
            model.rotation.x = -Math.PI / 2;
            model.rotation.y = Math.PI;
            model.rotation.z = Math.PI / 2;
            model.scale.set(0.5, 0.5, 0.5);
        } else {
            model.position.set(0.7, -0.2, 0);
            model.rotation.x = -Math.PI / 2;
            model.rotation.y = Math.PI;
            model.rotation.z = -Math.PI / 2;
            model.scale.set(0.5, 0.5, 0.5);
        }

        model.userData.side = side;

        const bones = this.extractFingerBones(model);
        model.userData.bones = bones;
        model.userData.fingers = this.createFingerStructureFromBones(bones);

        console.log(`Hand model setup complete with proven positioning:`, {
            side: side,
            position: [model.position.x, model.position.y, model.position.z],
            rotation: [model.rotation.x, model.rotation.y, model.rotation.z],
            bonesFound: Object.keys(bones),
            fingersCreated: Object.keys(model.userData.fingers)
        });

        return model;
    }
    
    /**
     * Extract finger bones from the hand model for animation
     */
    extractFingerBones(model) {
        const bones = {
            thumb: [],
            index: [],
            middle: [],
            ring: [],
            pinky: []
        };
        const allBones = [];
        
        model.traverse((child) => {
            if (child.isBone) {
                allBones.push(child.name);
                // Map bone names to finger types
                const boneName = child.name.toLowerCase();
                this._log('debug','Found bone:', boneName);
                
                if (boneName.includes('thumb')) {
                    bones.thumb.push(child);
                } else if (boneName.includes('index')) {
                    bones.index.push(child);
                } else if (boneName.includes('middle')) {
                    bones.middle.push(child);
                } else if (boneName.includes('ring')) {
                    bones.ring.push(child);
                } else if (boneName.includes('pinky') || boneName.includes('little')) {
                    bones.pinky.push(child);
                }
            }
        });
        
        this._log('debug','All bones found in model:', allBones);
        this._log('info','Extracted finger bones by type:', {
            thumb: bones.thumb.length,
            index: bones.index.length,
            middle: bones.middle.length,
            ring: bones.ring.length,
            pinky: bones.pinky.length
        });
        return bones;
    }
    
    /**
     * Create finger structure compatible with HandController from extracted bones
     */
    createFingerStructureFromBones(bones) {
        const fingers = {};
        const fingerNames = ['thumb', 'index', 'middle', 'ring', 'pinky'];

        fingerNames.forEach(fingerName => {
            const source = bones[fingerName] || [];
            // Only use deform chain joints: *_01R_*, *_02R_*, *_03R_*
            const deform = source.filter(b => {
                const n = b.name.toLowerCase();
                return (
                    n.includes(`${fingerName}_01r_`) ||
                    n.includes(`${fingerName}_02r_`) ||
                    n.includes(`${fingerName}_03r_`)
                ) && !n.includes('_ctrl') && !n.includes('_tip') && !n.includes('_end');
            }).sort((a, b) => {
                const am = a.name.match(/_(\d+)r_/i);
                const bm = b.name.match(/_(\d+)r_/i);
                return (am ? parseInt(am[1]) : 0) - (bm ? parseInt(bm[1]) : 0);
            });

            const base = deform[0] || null;
            const middle = deform[1] || null;
            const tip = deform[2] || null;

            // Try to locate a higher-level root (metacarpal/control) bone for splay
            const rootCandidate = (bones[fingerName] || []).find(b => b.name.toLowerCase().includes(`${fingerName}_baser_`))
                                 || (bones[fingerName] || []).find(b => b.name.toLowerCase().includes(`${fingerName}_ctrlr_`))
                                 || null;

            fingers[fingerName] = { userData: { root: rootCandidate, base, middle, tip } };

            this._log('debug',`🎯 DEFORM CHAIN ${fingerName}:`, {
                bones: deform.map(b => b.name),
                root: rootCandidate?.name,
                base: base?.name,
                middle: middle?.name,
                tip: tip?.name
            });
        });

        return fingers;
    }
    
    /**
     * Sort bones by their hierarchy (parent to child) for proper joint order
     */
    sortBonesByHierarchy(boneArray) {
        if (boneArray.length <= 1) return boneArray;
        
        // Create a map of bone relationships
        const boneMap = new Map();
        const rootBones = [];
        
        boneArray.forEach(bone => {
            boneMap.set(bone, {
                bone: bone,
                children: [],
                parent: null,
                depth: 0
            });
        });
        
        // Establish parent-child relationships
        boneArray.forEach(bone => {
            const parent = bone.parent;
            if (parent && boneMap.has(parent)) {
                boneMap.get(parent).children.push(bone);
                boneMap.get(bone).parent = parent;
            } else {
                rootBones.push(bone);
            }
        });
        
        // Calculate depth from root
        const calculateDepth = (bone, depth = 0) => {
            const boneData = boneMap.get(bone);
            if (boneData) {
                boneData.depth = depth;
                boneData.children.forEach(child => {
                    calculateDepth(child, depth + 1);
                });
            }
        };
        
        rootBones.forEach(root => calculateDepth(root));
        
        // Sort by depth (root to tip)
        return boneArray.sort((a, b) => {
            const depthA = boneMap.get(a)?.depth || 0;
            const depthB = boneMap.get(b)?.depth || 0;
            return depthA - depthB;
        });
    }
    
    /**
     * Create enhanced realistic hand models with improved geometry using optimal positioning
     */
    async createPlaceholderHands() {
        // Initialize the enhanced realistic hand geometry generator
        const handGeometry = new RealisticHandGeometry();
        
        this._log('info','🔄 FALLBACK: Using procedural hand geometry with optimal Task 1 settings');
        
        // Create left hand with optimal positioning for visibility
        this.leftHand = handGeometry.createEnhancedHand('left');
        this.leftHand.position.set(-0.7, -0.2, 0);  // Optimal position from analysis
        this.leftHand.rotation.y = Math.PI / 2;  // +90° - back facing user
        this.leftHand.rotation.x = 0;  // No tilt - fingers pointing up
        this.leftHand.rotation.z = 0;
        this.leftHand.scale.set(0.50, 0.50, 0.50);  // Optimal scale
        this.scene.add(this.leftHand);
        
        this._log('info','👈 LEFT PROCEDURAL HAND: [-0.7, -0.2, 0], Scale: 0.50, Back facing user');
        
        // Create right hand with optimal positioning for visibility
        this.rightHand = handGeometry.createEnhancedHand('right');
        this.rightHand.position.set(0.7, -0.2, 0);   // Optimal position from analysis
        this.rightHand.rotation.y = -Math.PI / 2;  // -90° - back facing user
        this.rightHand.rotation.x = 0;  // No tilt - fingers pointing up
        this.rightHand.rotation.z = 0;
        this.rightHand.scale.set(0.50, 0.50, 0.50);  // Optimal scale
        this.scene.add(this.rightHand);
        
        this._log('info','👉 RIGHT PROCEDURAL HAND: [0.7, -0.2, 0], Scale: 0.50, Back facing user');
        
        // Add subtle animation to make hands feel alive
        this.addIdleAnimations();
    }
    
    /**
     * Add subtle idle animations to make hands feel alive
     */
    addIdleAnimations() {
        // Gentle breathing-like movement
        const breathingAnimation = () => {
            const time = Date.now() * 0.001;
            const breathFactor = Math.sin(time * 0.5) * 0.02;
            
            // ONLY animate position, NOT rotation (rotation is controlled by sliders)
            if (this.leftHand) {
                this.leftHand.position.y = -0.2 + breathFactor; // Use base Y position
                // REMOVED: this.leftHand.rotation.x = Math.PI * 0.05 + breathFactor * 0.1;
            }
            
            if (this.rightHand) {
                this.rightHand.position.y = -0.2 + breathFactor; // Use base Y position
                // REMOVED: this.rightHand.rotation.x = Math.PI * 0.05 + breathFactor * 0.1;
            }
        };
        
        // Add to animation loop
        this.idleAnimation = breathingAnimation;
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Mouse controls disabled for fixed optimal view
        // this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        // this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        // this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        // this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        
        // Scene control buttons
        const resetCam = document.getElementById('reset-camera');
        if (resetCam) resetCam.addEventListener('click', this.resetCamera.bind(this));
        const toggleWire = document.getElementById('toggle-wireframe');
        if (toggleWire) toggleWire.addEventListener('click', this.toggleWireframe.bind(this));
        
        // Hand control sliders (only those with data-hand/finger)
        const sliders = document.querySelectorAll('input[type="range"][data-hand][data-finger]');
        sliders.forEach(slider => {
            slider.addEventListener('input', this.onFingerControl.bind(this));
        });
        
        // Number buttons for individual hands
        const numberButtons = document.querySelectorAll('.number-btn');
        numberButtons.forEach(button => {
            button.addEventListener('click', this.onNumberButtonClick.bind(this));
        });
        
        // Calculator buttons for total values
        const calcButtons = document.querySelectorAll('.calc-btn');
        calcButtons.forEach(button => {
            button.addEventListener('click', this.onCalcButtonClick.bind(this));
        });
        
        // Control buttons
        const btnResetHands = document.getElementById('reset-hands');
        if (btnResetHands) btnResetHands.addEventListener('click', this.resetHands.bind(this));
        const btnDemo = document.getElementById('demo-counting');
        if (btnDemo) btnDemo.addEventListener('click', this.demoCountingSequence.bind(this));
        const btnValidate = document.getElementById('validate-positions');
        if (btnValidate) btnValidate.addEventListener('click', this.validateAllPositions.bind(this));
        
        // DEBUG ROTATION CONTROLS COMMENTED OUT - USING HARDCODED VALUES
        // this.setupRotationControls();
        
        if (this.canvas) {
            this.canvas.addEventListener('pointerdown', this.onCanvasPointerDown.bind(this));
        }
    }

    /**
     * Handle canvas pointer down to check if a finger bone/mesh was clicked
     */
    onCanvasPointerDown(event) {
        if (!this.leftHand || !this.rightHand || !this.handController) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const mouse = new THREE.Vector2(x, y);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        // Intersect left and right hands
        const intersects = raycaster.intersectObjects([this.leftHand, this.rightHand], true);
        
        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            const hitPoint = intersects[0].point;
            
            let hand = null;
            let handSide = null;
            
            let parent = hitObject;
            while (parent) {
                if (parent === this.leftHand) {
                    hand = this.leftHand;
                    handSide = 'left';
                    break;
                }
                if (parent === this.rightHand) {
                    hand = this.rightHand;
                    handSide = 'right';
                    break;
                }
                parent = parent.parent;
            }
            
            if (hand && handSide) {
                const fingerName = this.getClosestFinger(hand, hitPoint);
                if (fingerName) {
                    this._log('info', `Clicked ${handSide} hand, finger: ${fingerName}`);
                    this.toggleFingerInteractive(handSide, fingerName);
                }
            }
        }
    }

    /**
     * Find the closest finger based on distance to bones in 3D world space
     */
    getClosestFinger(hand, point) {
        if (!hand || !hand.userData || !hand.userData.fingers) return null;
        let closestFinger = null;
        let minDistance = Infinity;
        const tempV = new THREE.Vector3();
        
        for (const fingerName of ['thumb', 'index', 'middle', 'ring', 'pinky']) {
            const finger = hand.userData.fingers[fingerName];
            if (!finger) continue;
            
            const joints = [finger.userData.base, finger.userData.middle, finger.userData.tip];
            for (const joint of joints) {
                if (!joint) continue;
                joint.getWorldPosition(tempV);
                const dist = point.distanceTo(tempV);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestFinger = fingerName;
                }
            }
        }
        
        if (minDistance < 0.4) {
            return closestFinger;
        }
        return null;
    }

    /**
     * Toggle the state of the finger and update calculations/displays
     */
    toggleFingerInteractive(handSide, fingerName) {
        if (!this.handController || !this.calculator) return;
        
        const currentTarget = this.handController.targetPositions[handSide][fingerName];
        const nextPos = currentTarget > 0.5 ? 0 : 1;
        
        this.handController.setFingerPosition(handSide, fingerName, nextPos);
        
        // Calculate new value for the hand: Thumb=5, other fingers=1 each
        const thumbVal = (this.handController.targetPositions[handSide].thumb > 0.5) ? 5 : 0;
        const indexVal = (this.handController.targetPositions[handSide].index > 0.5) ? 1 : 0;
        const middleVal = (this.handController.targetPositions[handSide].middle > 0.5) ? 1 : 0;
        const ringVal = (this.handController.targetPositions[handSide].ring > 0.5) ? 1 : 0;
        const pinkyVal = (this.handController.targetPositions[handSide].pinky > 0.5) ? 1 : 0;
        
        const handValue = thumbVal + indexVal + middleVal + ringVal + pinkyVal;
        
        // Update mathematical state
        this.calculator.setHandValue(handSide, handValue);
        
        // Update all UI elements
        this.updateAllDisplays();
        this.highlightActiveButton(handSide, handSide === 'left' ? handValue * 10 : handValue);
        
        setTimeout(() => {
            this.validateHandPosition(handSide);
        }, 100);
    }
    
    // DEBUG ROTATION CONTROL METHODS REMOVED - USING HARDCODED OPTIMAL VALUES
    // setupRotationControls() and applySliderRotations() methods removed as they are no longer needed
    
    /**
     * Handle window resize - maintain optimal hand positioning
     */
    onWindowResize() {
        const width = this.sceneContainer.clientWidth;
        const height = this.sceneContainer.clientHeight;
        
        this._log('info',`🔄 RESIZE EVENT: Container dimensions: ${width}px × ${height}px`);
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        
        // Reapply optimal positioning after resize to ensure hands stay visible
        setTimeout(() => {
            if (this.leftHand && this.rightHand) {
                this._log('info','🔧 RESIZE: Reapplying optimal hand positioning...');
                this.applyOptimalTask1Settings();
            }
        }, 100);
    }
    
    /**
     * Handle mouse down for camera controls
     */
    onMouseDown(event) {
        this.controls.isRotating = true;
        this.controls.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
    
    /**
     * Handle mouse move for camera rotation
     */
    onMouseMove(event) {
        if (!this.controls.isRotating) return;
        
        const deltaMove = {
            x: event.clientX - this.controls.previousMousePosition.x,
            y: event.clientY - this.controls.previousMousePosition.y
        };
        
        // Rotate camera around the scene
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(this.camera.position);
        
        spherical.theta -= deltaMove.x * this.controls.rotationSpeed;
        spherical.phi += deltaMove.y * this.controls.rotationSpeed;
        
        // Limit vertical rotation
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        
        this.camera.position.setFromSpherical(spherical);
        this.camera.lookAt(0, 0, 0);
        
        this.controls.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
    
    /**
     * Handle mouse up
     */
    onMouseUp() {
        this.controls.isRotating = false;
    }
    
    /**
     * Handle mouse wheel for zooming
     */
    onWheel(event) {
        const distance = this.camera.position.length();
        const newDistance = Math.max(
            this.controls.minDistance,
            Math.min(this.controls.maxDistance, 
                distance + event.deltaY * this.controls.zoomSpeed * 0.01)
        );
        
        this.camera.position.multiplyScalar(newDistance / distance);
    }
    
    /**
     * Reset camera to fixed optimal position for viewing both hands
     */
    resetCamera() {
        this.camera.position.set(0, 0.2, 3.5);
        this.camera.lookAt(0, 0, 0);
    }
    
    /**
     * Toggle wireframe mode
     */
    toggleWireframe() {
        this.isWireframe = !this.isWireframe;
        
        this.scene.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.wireframe = this.isWireframe;
            }
        });
    }

    /**
     * Setup debug panel handlers for finger animation (open/close)
     */
    setupDebugFingerAnimator() {
        const handSel = document.getElementById('anim-hand');
        const fingerSel = document.getElementById('anim-finger');
        const slider = document.getElementById('anim-curl');
        const debugHeader = document.getElementById('debug-finger-header');
        const debugContent = document.getElementById('debug-finger-content');
        const startBtn = document.getElementById('anim-start-debug');
        const onceBtn = document.getElementById('anim-once');
        const copySummaryBtn = document.getElementById('anim-copy-summary');
        const copyFullBtn = document.getElementById('anim-copy-full');
        const clearBtn = document.getElementById('anim-clear-log');
        const valSpan = document.getElementById('anim-curl-val');
        const status = document.getElementById('anim-status');

        if (debugHeader && debugContent) {
            debugHeader.addEventListener('click', () => {
                debugContent.style.display = debugContent.style.display === 'none' ? 'block' : 'none';
            });
        }

        if (!handSel || !fingerSel || !slider) return;

        const apply = () => {
            if (!this.handController) return;
            const hand = handSel.value;
            const finger = fingerSel.value;
            const v = parseFloat(slider.value);
            this.handController.setFingerPosition(hand, finger, v);
            if (valSpan) valSpan.textContent = v.toFixed(2);
        };
        slider.addEventListener('input', apply);

        // Debug-only logging helpers (scoped to this panel)
        const dbg = (...args) => console.log('[DBG-FINGER]', ...args);
        const getFingerBones = () => {
            const hand = handSel.value;
            const finger = fingerSel.value;
            const handObj = hand === 'left' ? this.leftHand : this.rightHand;
            const f = handObj?.userData?.fingers?.[finger];
            if (!f) return null;
            const c = f.userData || f;
            return { hand, finger, base: c.base, middle: c.middle, tip: c.tip };
        };
        const boneState = (b) => b ? ({
            name: b.name,
            q: { x: b.quaternion.x, y: b.quaternion.y, z: b.quaternion.z, w: b.quaternion.w },
            e: { x: b.rotation.x, y: b.rotation.y, z: b.rotation.z }
        }) : null;

        const captureBaseline = () => {
            const bones = getFingerBones();
            if (!bones) { status.textContent = 'No finger bones found'; return; }
            const rest = {
                base: bones.base?.userData?.restQuaternion ? bones.base.userData.restQuaternion.clone() : null,
                middle: bones.middle?.userData?.restQuaternion ? bones.middle.userData.restQuaternion.clone() : null,
                tip: bones.tip?.userData?.restQuaternion ? bones.tip.userData.restQuaternion.clone() : null,
            };
            const baseline = {
                ts: Date.now(),
                hand: bones.hand,
                finger: bones.finger,
                slider: parseFloat(slider.value),
                currentPosition: this.handController?.currentPositions?.[bones.hand]?.[bones.finger] ?? null,
                base: boneState(bones.base),
                middle: boneState(bones.middle),
                tip: boneState(bones.tip),
                restQ: {
                    base: rest.base ? { x: rest.base.x, y: rest.base.y, z: rest.base.z, w: rest.base.w } : null,
                    middle: rest.middle ? { x: rest.middle.x, y: rest.middle.y, z: rest.middle.z, w: rest.middle.w } : null,
                    tip: rest.tip ? { x: rest.tip.x, y: rest.tip.y, z: rest.tip.z, w: rest.tip.w } : null,
                }
            };
            this._debugFinger = { active: true, samples: [], baseline };
            // Also capture the current pose as the calibrated closed pose for controller blending
            if (this.handController) {
                const ok = this.handController.captureClosedPose(bones.hand, bones.finger);
                if (!ok) this._log('warn','Failed to capture closed pose');
            }
            dbg('Baseline captured', baseline);
            status.textContent = 'Baseline captured';
        };

        const sampleNow = (meta) => {
            if (!this._debugFinger.active) return;
            const bones = getFingerBones();
            if (!bones) return;
            const rec = {
                t: Date.now(),
                slider: parseFloat(slider.value),
                currentPosition: this.handController?.currentPositions?.[bones.hand]?.[bones.finger] ?? null,
                targetPosition: this.handController?.targetPositions?.[bones.hand]?.[bones.finger] ?? null,
                base: boneState(bones.base),
                middle: boneState(bones.middle),
                tip: boneState(bones.tip),
                ...(meta || {})
            };
            this._debugFinger.samples.push(rec);
        };

        const animateOnce = async () => {
            if (!this._debugFinger.active) { status.textContent = 'Click Start Debug first'; return; }
            status.textContent = 'Animating...';
            dbg('Animate Once started');
            const steps = 40;
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            // Temporarily speed up easing for clearer step-to-step tracking
            const ctrl = this.handController;
            const prevSpeed = ctrl ? ctrl.animationSpeed : null;
            if (ctrl) ctrl.animationSpeed = 0.2;
            // open 0->1
            for (let i=0;i<=steps;i++) {
                const v = (i/steps);
                slider.value = v.toFixed(2);
                apply();
                sampleNow({ phase: 'open' });
                await sleep(16);
            }
            // close 1->0
            for (let i=steps;i>=0;i--) {
                const v = (i/steps);
                slider.value = v.toFixed(2);
                apply();
                sampleNow({ phase: 'close' });
                await sleep(16);
            }
            // Let the pose settle at the end, then capture a final sample
            await sleep(200);
            sampleNow({ phase: 'settle' });
            if (ctrl && prevSpeed != null) ctrl.animationSpeed = prevSpeed;
            status.textContent = `Done. Samples: ${this._debugFinger.samples.length}`;
            dbg('Animate Once finished. Samples:', this._debugFinger.samples.length);
        };

        // Summary builder to keep results small and focused
        const rad2deg = (r) => r * 180 / Math.PI;
        const jointDeg = (s) => s && s.e ? { x: rad2deg(s.e.x), y: rad2deg(s.e.y), z: rad2deg(s.e.z) } : null;
        const primaryDeg = (_finger, s) => {
            const d = jointDeg(s);
            if (!d) return null;
            // After Step A, curl is primarily around X for all fingers
            return d.x;
        };
        const buildSummary = () => {
            const sess = this._debugFinger;
            if (!sess.active || !sess.baseline) return null;
            const { hand, finger } = sess.baseline;
            const samples = sess.samples || [];
            const first = samples[0];
            const midIdx = Math.floor(samples.length/2);
            const mid = samples[midIdx];
            const last = samples[samples.length-1];
            // Find extremes by absolute primary angle (most closed = max |angle|, most open = min |angle|)
            let mostClosed = { val: -1, idx: -1 };
            let mostOpen = { val: Number.POSITIVE_INFINITY, idx: -1 };
            samples.forEach((s, i) => {
                const p = Math.abs(primaryDeg(finger, s.base) ?? 0);
                if (p > mostClosed.val) { mostClosed = { val: p, idx: i }; }
                if (p < mostOpen.val) { mostOpen = { val: p, idx: i }; }
            });
            // Anomaly detection: slider change with < threshold rotation change
            const anomalies = [];
            const thDeg = 0.2; // tighter threshold (deg) after Step A axis alignment
            for (let i=1;i<samples.length;i++) {
                const prev = samples[i-1];
                const cur = samples[i];
                const ds = Math.abs((cur.slider||0) - (prev.slider||0));
                if (ds < 0.02) continue;
                const dp = Math.abs((primaryDeg(finger, cur.base)||0) - (primaryDeg(finger, prev.base)||0));
                if (dp < thDeg) {
                    anomalies.push({ i, t: cur.t, slider: cur.slider, deltaSlider: ds.toFixed(2), deltaPrimaryDeg: dp.toFixed(2) });
                }
            }
            const pick = (s) => s ? {
                t: s.t,
                slider: s.slider,
                current: s.currentPosition,
                target: s.targetPosition,
                baseDeg: jointDeg(s.base),
                middleDeg: jointDeg(s.middle),
                tipDeg: jointDeg(s.tip)
            } : null;
            return {
                hand, finger,
                baseline: pick({ ...sess.baseline, base: sess.baseline.base, middle: sess.baseline.middle, tip: sess.baseline.tip }),
                keyframes: {
                    first: pick(first), mid: pick(mid), last: pick(last),
                    mostOpen: pick(samples[mostOpen.idx] || null),
                    mostClosed: pick(samples[mostClosed.idx] || null)
                },
                stats: { totalSamples: samples.length, anomalies: anomalies.length },
                anomalies
            };
        };

        const copySummary = async () => {
            if (!this._debugFinger.active) { status.textContent = 'No session'; return; }
            const summary = buildSummary();
            const payload = JSON.stringify(summary, null, 2);
            try { await navigator.clipboard.writeText(payload); status.textContent = 'Summary copied'; }
            catch (e) { console.log('[DBG-FINGER] Summary:', payload); status.textContent = 'Clipboard blocked, printed to console'; }
        };

        const copyFull = async () => {
            if (!this._debugFinger.active) { status.textContent = 'No session'; return; }
            // Strip quaternions to keep size smaller, keep eulers
            const slim = {
                baseline: (() => { const b = this._debugFinger.baseline; return b ? { hand: b.hand, finger: b.finger, slider: b.slider, currentPosition: b.currentPosition, baseDeg: jointDeg(b.base), middleDeg: jointDeg(b.middle), tipDeg: jointDeg(b.tip) } : null; })(),
                samples: this._debugFinger.samples.map(s => ({ t:s.t, slider:s.slider, current:s.currentPosition, target:s.targetPosition, baseDeg: jointDeg(s.base), middleDeg: jointDeg(s.middle), tipDeg: jointDeg(s.tip) }))
            };
            const payload = JSON.stringify(slim, null, 2);
            try { await navigator.clipboard.writeText(payload); status.textContent = 'Full (slim) copied'; }
            catch (e) { console.log('[DBG-FINGER] Full (slim):', slim); status.textContent = 'Clipboard blocked, printed to console'; }
        };

        const clearLog = () => {
            this._debugFinger = { active: false, samples: [], baseline: null };
            status.textContent = 'Cleared';
        };

        if (startBtn) startBtn.addEventListener('click', captureBaseline);
        if (onceBtn) onceBtn.addEventListener('click', () => { animateOnce(); });
        if (copySummaryBtn) copySummaryBtn.addEventListener('click', copySummary);
        if (copyFullBtn) copyFullBtn.addEventListener('click', copyFull);
        if (clearBtn) clearBtn.addEventListener('click', clearLog);
    }

    // --- logging helpers ---
    _levelNum(level) { const m = { silent:0, error:1, warn:2, info:3, debug:4 }; return m[level] ?? 2; }
    _logEnabled(level) { return this._levelNum(level) <= this._logLevelNum; }
    _log(level, ...args) { if (!this._logEnabled(level)) return; if (level==='error') console.error(...args); else if (level==='warn') console.warn(...args); else console.log(...args); }
    
    /**
     * Handle finger control slider changes
     */
    onFingerControl(event) {
        const slider = event.target;
        const hand = slider.dataset.hand;
        const finger = slider.dataset.finger;
        const value = parseFloat(slider.value);
        
        if (!hand || !finger) {
            // Ignore non-finger sliders (e.g., debug splay sliders)
            return;
        }
        
        if (this.handController) {
            this.handController.setFingerPosition(hand, finger, value);
            this.updateAllDisplays();
            
            // Clear active buttons since manual control was used
            this.clearActiveButtons();
            
            // Validate position after manual change
            setTimeout(() => {
                this.validateHandPosition(hand);
            }, 100);
        }
    }
    
    /**
     * Handle number button clicks for individual hands
     */
    onNumberButtonClick(event) {
        const button = event.target;
        const hand = button.dataset.hand;
        let value = parseInt(button.dataset.value);
        
        // Convert left hand button values to pattern indices (10,20,30... → 1,2,3...)
        if (hand === 'left' && value > 0) {
            value = value / 10; // Convert tens to pattern index
        }
        
        this._log('info',`🎯 ${hand.toUpperCase()} hand button clicked: pattern ${value}`);
        
        if (this.calculator) {
            this.updateHandStatus(hand, 'animating');
            
            // Set hand pattern using mathematical calculator
            const pattern = this.calculator.setHandValue(hand, value);
            console.log(`Finger pattern for ${hand} hand value ${value}:`, pattern);
            
            // Apply pattern to 3D hand if HandController exists
            if (this.handController) {
                this.applyFingerPattern(hand, pattern);
            }
            
            this.updateAllDisplays();
            this.highlightActiveButton(hand, hand === 'left' ? value * 10 : value);
            
            // Update status after animation completes
            setTimeout(() => {
                this.updateHandStatus(hand, 'ready');
                this.validateHandPosition(hand);
            }, 500);
        }
    }
    
    /**
     * Apply finger pattern to 3D hand model
     */
    applyFingerPattern(hand, pattern) {
        if (!this.handController) return;
        this._log('info',`Applying finger pattern to ${hand} hand (direct targets):`, pattern);
        const side = hand === 'left' ? 'left' : 'right';
        ['thumb','index','middle','ring','pinky'].forEach(f => {
            const pos = pattern[f] ? 1 : 0;
            this.handController.setFingerPosition(side, f, pos);
        });
    }
    
    /**
     * Handle calculator button clicks for total values
     */
    onCalcButtonClick(event) {
        const totalValue = parseInt(event.target.dataset.total);
        console.log(`🧮 Calculator button clicked: ${totalValue}`);
        
        if (this.calculator) {
            this.updateHandStatus('left', 'animating');
            this.updateHandStatus('right', 'animating');
            
            // Use mathematical calculator to decompose total
            const patterns = this.calculator.setTotalValue(totalValue);
            console.log(`Total ${totalValue} patterns:`, patterns);
            
            // Apply patterns to 3D hands
            if (this.handController) {
                this.applyFingerPattern('left', patterns.left);
                this.applyFingerPattern('right', patterns.right);
            }
            
            this.updateAllDisplays();
            this.highlightActiveButtons(totalValue);
            
            // Update status after animation completes
            setTimeout(() => {
                this.updateHandStatus('left', 'ready');
                this.updateHandStatus('right', 'ready');
                this.validateAllPositions();
            }, 500);
        }
    }
    
    /**
     * Reset both hands to closed position
     */
    resetHands() {
        console.log('🤲 Resetting hands to closed fists');
        
        if (this.calculator) {
            this.updateHandStatus('left', 'animating');
            this.updateHandStatus('right', 'animating');
            
            // Reset mathematical state
            const patterns = this.calculator.reset();
            console.log('Reset patterns:', patterns);
            
            // Apply reset patterns to 3D hands
            if (this.handController) {
                this.applyFingerPattern('left', patterns.left);
                this.applyFingerPattern('right', patterns.right);
            }
            
            this.updateAllDisplays();
            this.clearActiveButtons();
            
            setTimeout(() => {
                this.updateHandStatus('left', 'ready');
                this.updateHandStatus('right', 'ready');
            }, 500);
        }
    }
    
    /**
     * Demonstrate counting sequence from 0 to 9 on right hand
     */
    demoCountingSequence() {
        if (!this.handController || !this.calculator) return;
        
        // Phase 1: Right hand 0→9
        let r = 0;
        this.updateHandStatus('right', 'animating');
        const phaseRight = () => {
            if (r <= 9) {
                const pattern = this.calculator.setHandValue('right', r);
                this.applyFingerPattern('right', pattern);
                this.updateAllDisplays();
                this.highlightActiveButton('right', r);
                r++;
                setTimeout(phaseRight, 800);
            } else {
                this.updateHandStatus('right', 'ready');
                this.validateHandPosition('right');
                // Phase 2: Left hand 0→90 by tens (0..9)
                this.updateHandStatus('left', 'animating');
                let l = 0;
                const phaseLeft = () => {
                    if (l <= 9) {
                        const pattern = this.calculator.setHandValue('left', l);
                        this.applyFingerPattern('left', pattern);
                        this.updateAllDisplays();
                        this.highlightActiveButton('left', l*10);
                        l++;
                        setTimeout(phaseLeft, 800);
                    } else {
                        this.updateHandStatus('left', 'ready');
                        this.validateHandPosition('left');
                    }
                };
                setTimeout(phaseLeft, 600);
            }
        };
        phaseRight();
    }
    
    /**
     * Validate all hand positions
     */
    validateAllPositions() {
        if (!this.handController) return;
        
        this.validateHandPosition('left');
        this.validateHandPosition('right');
        
        const leftValid = this.handController.validateCountingPosition('left');
        const rightValid = this.handController.validateCountingPosition('right');
        
        const validationStatus = document.getElementById('validation-status');
        if (leftValid && rightValid) {
            validationStatus.textContent = 'Valid Position';
            validationStatus.className = 'validation-status valid';
        } else {
            validationStatus.textContent = 'Invalid Position';
            validationStatus.className = 'validation-status invalid';
        }
    }
    
    /**
     * Update hand status display
     */
    updateHandStatus(hand, status) {
        const statusElement = document.getElementById(`${hand}-hand-status`);
        if (statusElement) {
            statusElement.textContent = this.getStatusText(status);
            statusElement.className = `hand-status ${status}`;
        }
    }
    
    /**
     * Get status text for display
     */
    getStatusText(status) {
        const statusTexts = {
            'ready': window.i18n.t('status.ready'),
            'animating': window.i18n.t('status.animating'),
            'valid': window.i18n.t('status.valid'),
            'invalid': window.i18n.t('status.invalid')
        };
        return statusTexts[status] || window.i18n.t('status.unknown');
    }
    
    /**
     * Validate individual hand position
     */
    validateHandPosition(hand) {
        if (!this.handController) return;
        
        const isValid = this.handController.validateCountingPosition(hand);
        this.updateHandStatus(hand, isValid ? 'valid' : 'invalid');
    }
    
    /**
     * Highlight active button for a specific hand
     */
    highlightActiveButton(hand, value) {
        // Clear previous highlights for this hand
        document.querySelectorAll(`[data-hand="${hand}"]`).forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Highlight current button
        const activeButton = document.querySelector(`[data-hand="${hand}"][data-value="${value}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
    
    /**
     * Highlight active buttons for total value
     */
    highlightActiveButtons(totalValue) {
        const tens = Math.floor(totalValue / 10) * 10;
        const ones = totalValue % 10;
        
        this.highlightActiveButton('left', tens);
        this.highlightActiveButton('right', ones);
    }
    
    /**
     * Clear all active button highlights
     */
    clearActiveButtons() {
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }
    
    /**
     * Update all display elements
     */
    updateAllDisplays() {
        if (!this.calculator) return;
        
        const state = this.calculator.getCurrentState();
        const leftValue = state.left;
        const rightValue = state.right;
        const total = this.calculator.calculateTotal(leftValue, rightValue);
        
        console.log(`📊 Display update: Left=${leftValue}, Right=${rightValue}, Total=${total}`);
        
        // Update individual hand displays
        document.getElementById('left-hand-value').textContent = leftValue;
        document.getElementById('right-hand-value').textContent = rightValue;
        
        // Update total display
        document.getElementById('total-value').textContent = total;
        
        // Update breakdown display
        const leftTens = leftValue * 10;
        document.getElementById('left-display').textContent = leftTens;
        document.getElementById('right-display').textContent = rightValue;
        document.getElementById('sum-display').textContent = total;
        
        // Update sliders to match hand positions if HandController exists
        if (this.handController) {
            this.updateSlidersFromHands();
        }
        
        // Show mathematical state description in console for debugging
        console.log(`🖐️ ${this.calculator.getStateDescription()}`);

        if (typeof window.onHandMathStateChange === 'function') {
            window.onHandMathStateChange({ left: leftValue, right: rightValue, total });
        }
    }
    
    /**
     * Update sliders to match current hand positions
     */
    updateSlidersFromHands() {
        if (!this.handController) return;
        
        const hands = ['left', 'right'];
        const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
        
        hands.forEach(hand => {
            fingers.forEach(finger => {
                const slider = document.getElementById(`${hand}-${finger}`);
                const position = this.handController.targetPositions[hand][finger];
                
                if (slider) {
                    slider.value = position;
                }
            });
        });
    }
    
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
        setTimeout(() => {
            this.loadingOverlay.style.display = 'none';
        }, 300);
    }
    
    /**
     * Show error message
     */
    showError(message) {
        const loader = this.loadingOverlay.querySelector('.loader');
        loader.innerHTML = `
            <div style="color: #ef4444; text-align: center;">
                <svg width="50" height="50" viewBox="0 0 24 24" fill="currentColor" style="margin-bottom: 1rem;">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <p>${message}</p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
                    ${window.i18n.t('error.btnRetry')}
                </button>
            </div>
        `;
    }
    
    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        
        // Update idle animations
        if (this.idleAnimation) {
            this.idleAnimation();
        }
        
        // Update hand controller
        if (this.handController) {
            this.handController.update();
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
        
        // Update projection-based fingertip halos
        this.updateFingertipHalos();
    }

    /**
     * Project fingertip bones to 2D screen coordinates and render glowing interactive halos
     */
    updateFingertipHalos() {
        const container = document.getElementById('halos-container');
        if (!container) return;
        
        // Clear previous halos
        container.innerHTML = '';
        
        if (!this.leftHand || !this.rightHand || !this.camera) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        const sides = ['left', 'right'];
        const tempV = new THREE.Vector3();
        
        sides.forEach(side => {
            const hand = side === 'left' ? this.leftHand : this.rightHand;
            const overlay = document.getElementById(side === 'left' ? 'overlayLeft' : 'overlayRight');
            
            // Draw halos if the hand's overlay is active (highlighted)
            if (overlay && overlay.classList.contains('on')) {
                // Get active fingers from data-open or data-close attributes
                const openAttr = overlay.getAttribute('data-open');
                const closeAttr = overlay.getAttribute('data-close');
                const activeFingers = new Set();
                
                if (openAttr) openAttr.split(',').forEach(f => activeFingers.add(f.trim()));
                if (closeAttr) closeAttr.split(',').forEach(f => activeFingers.add(f.trim()));
                
                // If no specific fingers are in transition, default to drawing halos on all extended fingers
                if (activeFingers.size === 0) {
                    ['thumb', 'index', 'middle', 'ring', 'pinky'].forEach(f => {
                        if (this.handController && this.handController.targetPositions[side][f] > 0.5) {
                            activeFingers.add(f);
                        }
                    });
                }
                
                activeFingers.forEach(fingerName => {
                    const finger = hand.userData.fingers?.[fingerName];
                    const tip = finger?.userData?.tip;
                    if (!tip) return;
                    
                    // Project tip position to screen space
                    tip.getWorldPosition(tempV);
                    tempV.project(this.camera);
                    
                    // Convert normalized coordinates (-1 to 1) to canvas pixels
                    const x = (tempV.x * 0.5 + 0.5) * width;
                    const y = (-(tempV.y * 0.5) + 0.5) * height;
                    
                    // Check if the projected point is within the visible canvas bounds
                    if (x >= 0 && x <= width && y >= 0 && y <= height) {
                        const halo = document.createElement('div');
                        halo.className = `fingertip-halo ${side}`;
                        halo.style.position = 'absolute';
                        halo.style.left = `${x}px`;
                        halo.style.top = `${y}px`;
                        halo.style.transform = 'translate(-50%, -50%)';
                        
                        const color = side === 'left' ? '#22c55e' : '#3b82f6'; // green for left, blue for right
                        
                        halo.style.width = '24px';
                        halo.style.height = '24px';
                        halo.style.borderRadius = '50%';
                        halo.style.border = `2px solid ${color}`;
                        halo.style.boxShadow = `0 0 10px ${color}, inset 0 0 10px ${color}`;
                        halo.style.animation = 'pulse-halo 1.5s infinite ease-in-out';
                        
                        container.appendChild(halo);
                    }
                });
            }
        });
    }
    
    /**
     * Force apply optimal Task 1 settings after hands are loaded - responsive to container size
     */
    applyOptimalTask1Settings() {
        this._log('info','🔧 FORCING OPTIMAL TASK 1 SETTINGS');
        this._log('info','=====================================');
        
        if (!this.leftHand || !this.rightHand) {
            console.error('❌ Cannot apply settings: Hands not loaded');
            return;
        }

        // Get current container dimensions
        const containerWidth = this.sceneContainer.clientWidth;
        const containerHeight = this.sceneContainer.clientHeight;
        const aspectRatio = containerWidth / containerHeight;
        
        this._log('info',`📐 CONTAINER: ${containerWidth}px × ${containerHeight}px (aspect: ${aspectRatio.toFixed(2)})`);

        // Calculate optimal settings based on container size
        let optimalFOV = 39;
        let optimalDistance = 3.0;
        let optimalScale = 0.50;
        let handSpacing = 0.7;

        // Adjust for different aspect ratios
        if (aspectRatio > 2.0) {
            // Very wide container
            optimalFOV = 35;
            optimalDistance = 2.8;
            optimalScale = 0.45;
            handSpacing = 0.8;
            this._log('info','📏 ADJUSTMENT: Wide container detected');
        } else if (aspectRatio < 1.5) {
            // Tall container - fixed height should prevent extreme cases
            optimalFOV = 42;
            optimalDistance = 3.2;
            optimalScale = 0.55;
            handSpacing = 0.6;
            this._log('info','📏 ADJUSTMENT: Tall container detected');
        }

        // Apply optimal camera settings
        this._log('info','📷 CAMERA: Applying responsive settings...');
        this.camera.fov = optimalFOV;
        this.camera.position.set(0, 0.2, optimalDistance);
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(0, 0, 0);
        this._log('info',`✅ CAMERA: FOV=${optimalFOV}°, Position=[0, 0.2, ${optimalDistance}]`);

        // Keep consistent Y position - the issue is not here
        const handY = -0.2;
        
        // Apply optimal left hand settings - INTERACTIVE MODE (controlled by sliders)
        this._log('info','👈 LEFT HAND: Applying responsive settings...');
        this.leftHand.position.set(-handSpacing, handY, 0);
        // IMPORTANT: Group-level mirror X only
        this.leftHand.scale.set(optimalScale, optimalScale, optimalScale);
        this.leftHand.scale.x = -optimalScale; // mirror on X
        this._log('info',`✅ LEFT HAND: Position=[${-handSpacing}, ${handY}, 0], Rotation=PRESERVED (slider-controlled), Scale=[-${optimalScale}, ${optimalScale}, ${optimalScale}] (MIRRORED)`);

        // Apply optimal right hand settings - INTERACTIVE MODE (controlled by sliders)  
        this._log('info','👉 RIGHT HAND: Applying responsive settings...');
        this.rightHand.position.set(handSpacing, handY, 0);
        this.rightHand.scale.set(optimalScale, optimalScale, optimalScale);  // Normal scale
        this._log('info',`✅ RIGHT HAND: Position=[${handSpacing}, ${handY}, 0], Rotation=PRESERVED (slider-controlled), Scale=${optimalScale}`);
        
        this._log('info','🎯 RESPONSIVE SETTINGS APPLIED - Testing compliance...');
        this._log('info','=====================================');
    }

    /**
     * Verify Task 1 compliance - hands fully visible without camera controls
     */
    verifyTask1Compliance() {
        this._log('info','🎯 TASK 1 COMPLIANCE VERIFICATION');
        this._log('info','==================================');
        
        if (!this.leftHand || !this.rightHand || !this.camera) {
            console.error('❌ COMPLIANCE FAILED: Missing hands or camera');
            return false;
        }

        // Check visibility in camera frustum
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4().multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(matrix);

        const leftBox = new THREE.Box3().setFromObject(this.leftHand);
        const rightBox = new THREE.Box3().setFromObject(this.rightHand);

        const leftVisible = frustum.intersectsBox(leftBox);
        const rightVisible = frustum.intersectsBox(rightBox);

        // Get screen positions
        const leftScreenPos = this.getScreenPosition(this.leftHand.position);
        const rightScreenPos = this.getScreenPosition(this.rightHand.position);

        // Container dimensions
        const containerWidth = this.sceneContainer.clientWidth;
        const containerHeight = this.sceneContainer.clientHeight;

        // Check if hands are within container bounds
        const leftInBounds = leftScreenPos.x > 0 && leftScreenPos.x < containerWidth && 
                           leftScreenPos.y > 0 && leftScreenPos.y < containerHeight;
        const rightInBounds = rightScreenPos.x > 0 && rightScreenPos.x < containerWidth && 
                            rightScreenPos.y > 0 && rightScreenPos.y < containerHeight;

        console.log('📊 COMPLIANCE METRICS:');
        console.log(`   Container: ${containerWidth}px × ${containerHeight}px`);
        console.log(`   Left Hand Screen: [${leftScreenPos.x.toFixed(0)}px, ${leftScreenPos.y.toFixed(0)}px]`);
        console.log(`   Right Hand Screen: [${rightScreenPos.x.toFixed(0)}px, ${rightScreenPos.y.toFixed(0)}px]`);
        console.log(`   Hands Distance: ${Math.abs(rightScreenPos.x - leftScreenPos.x).toFixed(0)}px apart`);
        
        console.log('✅ COMPLIANCE CHECKLIST:');
        console.log(`   ${leftVisible ? '✅' : '❌'} Left hand visible in camera frustum`);
        console.log(`   ${rightVisible ? '✅' : '❌'} Right hand visible in camera frustum`);
        console.log(`   ${leftInBounds ? '✅' : '❌'} Left hand within container bounds`);
        console.log(`   ${rightInBounds ? '✅' : '❌'} Right hand within container bounds`);
        console.log(`   ${this.leftHand.scale.x < 0 ? '✅' : '❌'} Left hand mirrored (scale.x=${this.leftHand.scale.x.toFixed(2)})`);
        console.log(`   ${this.rightHand.scale.x > 0 ? '✅' : '❌'} Right hand normal (scale.x=${this.rightHand.scale.x.toFixed(2)})`);
        console.log(`   ${Math.abs(this.leftHand.rotation.y - Math.PI) < 0.1 ? '✅' : '❌'} Left hand back facing user (${(this.leftHand.rotation.y * 180/Math.PI).toFixed(0)}°)`);
        console.log(`   ${Math.abs(this.rightHand.rotation.y - Math.PI) < 0.1 ? '✅' : '❌'} Right hand back facing user (${(this.rightHand.rotation.y * 180/Math.PI).toFixed(0)}°)`);
        // Fingers pointing up for Task 1 occur when X ≈ -90° after our base transforms
        const leftFingersUp = Math.abs(this.leftHand.rotation.x + Math.PI / 2) < 0.1;
        const rightFingersUp = Math.abs(this.rightHand.rotation.x + Math.PI / 2) < 0.1;
        console.log(`   ${leftFingersUp ? '✅' : '❌'} Left hand fingers pointing up (${(this.leftHand.rotation.x * 180/Math.PI).toFixed(0)}°)`);
        console.log(`   ${rightFingersUp ? '✅' : '❌'} Right hand fingers pointing up (${(this.rightHand.rotation.x * 180/Math.PI).toFixed(0)}°)`);
        console.log(`   ${Math.abs(this.leftHand.position.x + 0.7) < 0.1 ? '✅' : '❌'} Left hand positioned at -0.7 (${this.leftHand.position.x.toFixed(2)})`);
        console.log(`   ${Math.abs(this.rightHand.position.x - 0.7) < 0.1 ? '✅' : '❌'} Right hand positioned at +0.7 (${this.rightHand.position.x.toFixed(2)})`);

        const allCompliant = leftVisible && rightVisible && leftInBounds && rightInBounds &&
                           this.leftHand.scale.x < 0 &&  // Left hand mirrored
                           this.rightHand.scale.x > 0 && // Right hand normal
                           Math.abs(this.leftHand.rotation.y - Math.PI) < 0.1 &&   // Left back facing user
                           Math.abs(this.rightHand.rotation.y - Math.PI) < 0.1 &&  // Right back facing user
                           leftFingersUp && rightFingersUp;

        console.log('🎯 TASK 1 COMPLIANCE STATUS:', allCompliant ? '✅ PASSED' : '❌ FAILED');
        console.log('==================================');
        
        return allCompliant;
    }

    /**
     * Get screen position of world coordinates
     */
    getScreenPosition(worldPosition) {
        const vector = worldPosition.clone().project(this.camera);
        return {
            x: (vector.x * 0.5 + 0.5) * this.sceneContainer.clientWidth,
            y: (-vector.y * 0.5 + 0.5) * this.sceneContainer.clientHeight
        };
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Clean up geometries and materials
        this.scene?.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}

// Initialize the application when the DOM is loaded and THREE.js is available
document.addEventListener('DOMContentLoaded', () => {
    // Wait for THREE.js and required loaders to be available
    function initApp() {
        if (window.threejsReady && typeof THREE !== 'undefined') {
            console.log('THREE.js and loaders are available, initializing app...');
            window.handMathApp = new HandMathApp();
        } else if (typeof THREE !== 'undefined') {
            // THREE.js is loaded but components might not be
            console.log('THREE.js loaded, but waiting for components...', {
                threejsReady: window.threejsReady,
                GLTFLoader: typeof THREE.GLTFLoader !== 'undefined',
                OrbitControls: typeof THREE.OrbitControls !== 'undefined'
            });
            setTimeout(initApp, 200);
        } else {
            console.log('Waiting for THREE.js to load...');
            setTimeout(initApp, 200);
        }
    }
    
    initApp();
});

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        if (window.handMathApp) {
            window.handMathApp.dispose();
        }
    });
