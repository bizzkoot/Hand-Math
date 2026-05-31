/**
 * Enhanced Realistic Hand Geometry Generator
 * 
 * Creates detailed 3D hand models with enhanced anatomical features including:
 * - Curved tube-based fingers with natural tapering
 * - Anatomical palm with proper muscle bulges (thenar and hypothenar eminences)
 * - Organic deformation for natural appearance
 * - Skin-like materials and texturing
 * - Maintains compatibility with existing finger animation system
 */

class RealisticHandGeometry {
    constructor() {
        // Anatomical proportions (based on real hand measurements)
        this.handProportions = {
            palmWidth: 1.0,
            palmLength: 1.2,
            palmThickness: 0.2,
            
            // Finger lengths relative to palm
            thumbLength: 0.8,
            indexLength: 0.95,
            middleLength: 1.0,
            ringLength: 0.9,
            pinkyLength: 0.7,
            
            // Finger segment ratios
            segmentRatios: {
                proximal: 0.45,  // Base segment
                middle: 0.3,     // Middle segment
                distal: 0.25     // Tip segment
            },
            
            // Finger thickness
            fingerThickness: {
                thumb: 0.08,
                index: 0.06,
                middle: 0.065,
                ring: 0.055,
                pinky: 0.05
            }
        };
        
        // Pre-calculated curves for natural hand shape
        this.palmCurve = this.generatePalmCurve();
        this.fingerCurves = this.generateFingerCurves();
    }
    
    /**
     * Generate a realistic palm curve for natural shape
     */
    generatePalmCurve() {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.5, 0, -0.6),
            new THREE.Vector3(-0.3, 0.1, -0.4),
            new THREE.Vector3(0, 0.1, -0.2),
            new THREE.Vector3(0.3, 0.1, -0.4),
            new THREE.Vector3(0.5, 0, -0.6),
            new THREE.Vector3(0.4, -0.1, 0.4),
            new THREE.Vector3(-0.4, -0.1, 0.4),
            new THREE.Vector3(-0.5, 0, -0.6)
        ]);
        return curve;
    }
    
    /**
     * Generate finger curves for natural bending
     */
    generateFingerCurves() {
        return {
            thumb: this.createFingerCurve(0.8, 0.3),
            index: this.createFingerCurve(0.95, 0.2),
            middle: this.createFingerCurve(1.0, 0.1),
            ring: this.createFingerCurve(0.9, 0.15),
            pinky: this.createFingerCurve(0.7, 0.25)
        };
    }
    
    /**
     * Create a natural curve for a finger
     */
    createFingerCurve(length, curvature) {
        return new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, length * 0.3, curvature * 0.1),
            new THREE.Vector3(0, length * 0.65, curvature * 0.2),
            new THREE.Vector3(0, length, curvature * 0.1)
        ]);
    }
    
    /**
     * Create a complete realistic hand model
     * @param {string} handSide - 'left' or 'right'
     * @param {THREE.Material} material - Material for the hand
     * @returns {THREE.Group} Complete hand group
     */
    createRealisticHand(handSide, material) {
        const handGroup = new THREE.Group();
        handGroup.userData = { side: handSide, fingers: {} };
        
        // Create realistic palm
        const palm = this.createRealisticPalm(material);
        handGroup.add(palm);
        
        // Create realistic fingers with proper positioning
        const fingerPositions = this.getFingerPositions(handSide);
        const fingerNames = ['thumb', 'index', 'middle', 'ring', 'pinky'];
        
        fingerNames.forEach((fingerName, index) => {
            const finger = this.createRealisticFinger(
                fingerName, 
                material, 
                fingerPositions[fingerName]
            );
            
            handGroup.userData.fingers[fingerName] = finger;
            handGroup.add(finger);
        });
        
        // Add subtle hand details
        this.addHandDetails(handGroup, material);
        
        return handGroup;
    }
    
    /**
     * Create enhanced anatomical palm with proper muscle bulges and realistic shape
     */
    createRealisticPalm(material) {
        const palmGroup = new THREE.Group();
        
        // Create main palm body with anatomical features
        const mainPalm = this.createAnatomicalPalmBase(material);
        palmGroup.add(mainPalm);
        
        // Add thenar eminence (thumb muscle bulge)
        const thenarEminence = this.createThenarEminence(material);
        palmGroup.add(thenarEminence);
        
        // Add hypothenar eminence (pinky side muscle)
        const hypothenarEminence = this.createHypothenarEminence(material);
        palmGroup.add(hypothenarEminence);
        
        // Add metacarpal arches for natural palm curvature
        const metacarpalArch = this.createMetacarpalArch(material);
        palmGroup.add(metacarpalArch);
        
        palmGroup.position.y = -0.1;
        
        return palmGroup;
    }
    
    /**
     * Create anatomically correct main palm base
     */
    createAnatomicalPalmBase(material) {
        // Create more sophisticated palm shape
        const palmGeometry = this.createAdvancedPalmGeometry();
        
        // Apply organic deformation for natural palm curvature
        this.applyPalmDeformation(palmGeometry);
        
        // Smooth the palm geometry
        this.optimizeGeometry(palmGeometry);
        this.smoothGeometry(palmGeometry, 0.2);
        
        const palm = new THREE.Mesh(palmGeometry, material);
        palm.castShadow = true;
        palm.receiveShadow = true;
        
        return palm;
    }
    
    /**
     * Create advanced palm geometry with proper anatomical shape
     */
    createAdvancedPalmGeometry() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        
        const palmWidth = this.handProportions.palmWidth;
        const palmLength = this.handProportions.palmLength;
        const palmThickness = this.handProportions.palmThickness;
        
        const segmentsX = 20; // Increased resolution for smoother curves
        const segmentsZ = 16;
        
        // Create palm surface with natural curvature
        for (let i = 0; i <= segmentsX; i++) {
            for (let j = 0; j <= segmentsZ; j++) {
                const u = i / segmentsX;
                const v = j / segmentsZ;
                
                // Map to palm coordinates
                const x = (u - 0.5) * palmWidth;
                const z = (v - 0.5) * palmLength;
                
                // Calculate anatomical palm surface height
                const y = this.calculatePalmSurfaceHeight(x, z, palmWidth, palmLength, palmThickness);
                
                vertices.push(x, y, z);
                
                // Calculate surface normal for proper lighting
                const normal = this.calculatePalmSurfaceNormal(x, z, palmWidth, palmLength, palmThickness);
                normals.push(normal.x, normal.y, normal.z);
                
                // UV coordinates for texturing
                uvs.push(u, v);
            }
        }
        
        // Create triangle indices
        for (let i = 0; i < segmentsX; i++) {
            for (let j = 0; j < segmentsZ; j++) {
                const a = i * (segmentsZ + 1) + j;
                const b = a + segmentsZ + 1;
                const c = a + 1;
                const d = b + 1;
                
                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }
        
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        
        return geometry;
    }
    
    /**
     * Calculate anatomical palm surface height with natural curves
     */
    calculatePalmSurfaceHeight(x, z, palmWidth, palmLength, palmThickness) {
        // Create natural palm curvature using anatomical references
        const normalizedX = x / palmWidth;
        const normalizedZ = z / palmLength;
        
        // Base palm thickness
        let height = palmThickness * 0.3;
        
        // Add natural palm arch (transverse and longitudinal)
        const transverseArch = Math.cos(normalizedX * Math.PI) * 0.15;
        const longitudinalArch = Math.sin((normalizedZ + 0.5) * Math.PI) * 0.1;
        
        height += transverseArch * palmThickness;
        height += longitudinalArch * palmThickness;
        
        // Add subtle randomness for organic feel
        const organicVariation = (Math.sin(x * 8) + Math.cos(z * 6)) * 0.01;
        height += organicVariation * palmThickness;
        
        return height;
    }
    
    /**
     * Calculate surface normal for palm lighting
     */
    calculatePalmSurfaceNormal(x, z, palmWidth, palmLength, palmThickness) {
        const delta = 0.01;
        
        // Calculate height at nearby points for normal computation
        const h1 = this.calculatePalmSurfaceHeight(x + delta, z, palmWidth, palmLength, palmThickness);
        const h2 = this.calculatePalmSurfaceHeight(x - delta, z, palmWidth, palmLength, palmThickness);
        const h3 = this.calculatePalmSurfaceHeight(x, z + delta, palmWidth, palmLength, palmThickness);
        const h4 = this.calculatePalmSurfaceHeight(x, z - delta, palmWidth, palmLength, palmThickness);
        
        // Calculate gradient
        const dx = (h1 - h2) / (2 * delta);
        const dz = (h3 - h4) / (2 * delta);
        
        // Normal vector
        const normal = new THREE.Vector3(-dx, 1, -dz).normalize();
        return normal;
    }
    
    /**
     * Create thenar eminence (thumb muscle bulge)
     */
    createThenarEminence(material) {
        const geometry = new THREE.SphereGeometry(0.15, 12, 12);
        
        // Shape it more like the thenar muscle
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Elongate and shape the thenar eminence
            positions[i] *= 1.2;     // Wider
            positions[i + 1] *= 0.6; // Flatter
            positions[i + 2] *= 0.8; // Less deep
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        const thenar = new THREE.Mesh(geometry, material);
        thenar.position.set(-0.3, 0.08, 0.15);
        thenar.castShadow = true;
        thenar.receiveShadow = true;
        
        return thenar;
    }
    
    /**
     * Create hypothenar eminence (pinky side muscle)
     */
    createHypothenarEminence(material) {
        const geometry = new THREE.SphereGeometry(0.12, 10, 10);
        
        // Shape it like the hypothenar muscle
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] *= 0.8;     // Narrower than thenar
            positions[i + 1] *= 0.5; // Flatter
            positions[i + 2] *= 1.2; // More elongated
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        const hypothenar = new THREE.Mesh(geometry, material);
        hypothenar.position.set(0.35, 0.05, -0.1);
        hypothenar.castShadow = true;
        hypothenar.receiveShadow = true;
        
        return hypothenar;
    }
    
    /**
     * Create metacarpal arch for natural palm curvature
     */
    createMetacarpalArch(material) {
        // Create subtle ridge across palm knuckles
        const geometry = new THREE.CylinderGeometry(0.02, 0.025, 0.6, 8);
        
        const arch = new THREE.Mesh(geometry, material);
        arch.position.set(0, 0.02, -0.4);
        arch.rotation.z = Math.PI * 0.5;
        arch.castShadow = true;
        arch.receiveShadow = true;
        
        return arch;
    }
    
    /**
     * Create anatomically correct palm shape
     */
    createPalmShape() {
        const shape = new THREE.Shape();
        
        // Define palm outline with natural curves
        const palmPoints = [
            new THREE.Vector2(-0.5, -0.6),   // Wrist left
            new THREE.Vector2(-0.55, -0.2),  // Left side curve
            new THREE.Vector2(-0.4, 0.2),    // Thumb base
            new THREE.Vector2(-0.25, 0.4),   // Between thumb and index
            new THREE.Vector2(0, 0.5),       // Top center
            new THREE.Vector2(0.25, 0.4),    // Between middle and ring
            new THREE.Vector2(0.45, 0.2),    // Right side
            new THREE.Vector2(0.55, -0.2),   // Right side curve
            new THREE.Vector2(0.5, -0.6),    // Wrist right
            new THREE.Vector2(0, -0.65),     // Wrist center
            new THREE.Vector2(-0.5, -0.6)    // Back to start
        ];
        
        // Create smooth palm outline
        shape.setFromPoints(palmPoints);
        
        // Add thumb pad indentation
        const thumbHole = new THREE.Path();
        thumbHole.absellipse(-0.3, 0.1, 0.15, 0.1, 0, Math.PI * 2, false, 0);
        shape.holes.push(thumbHole);
        
        return shape;
    }
    
    /**
     * Create realistic finger with proper joint hierarchy
     */
    createRealisticFinger(fingerName, material, position) {
        const fingerGroup = new THREE.Group();
        fingerGroup.position.copy(position.position);
        fingerGroup.rotation.copy(position.rotation);
        
        const fingerLength = this.handProportions[fingerName + 'Length'];
        const thickness = this.handProportions.fingerThickness[fingerName];
        const isThumb = fingerName === 'thumb';
        
        // Calculate segment lengths
        const segments = isThumb ? 2 : 3; // Thumb has 2 segments, others have 3
        const segmentLengths = this.calculateSegmentLengths(fingerLength, isThumb);
        
        let currentGroup = fingerGroup;
        let yOffset = 0;
        
        // Create finger segments with proper joint hierarchy
        for (let i = 0; i < segments; i++) {
            const segmentLength = segmentLengths[i];
            
            // Create joint group for rotation pivot
            const jointGroup = new THREE.Group();
            jointGroup.position.y = yOffset;
            currentGroup.add(jointGroup);
            
            // Create the actual segment mesh
            const segment = this.createFingerSegment(
                segmentLength, 
                thickness * (1 - i * 0.1), // Gradually taper
                material,
                i === segments - 1 // Is tip segment
            );
            
            jointGroup.add(segment);
            
            // Store joint group references for animation
            if (i === 0) {
                fingerGroup.userData.base = jointGroup;
            } else if (i === 1) {
                if (isThumb) {
                    fingerGroup.userData.tip = jointGroup;
                } else {
                    fingerGroup.userData.middle = jointGroup;
                }
            } else if (i === 2) {
                fingerGroup.userData.tip = jointGroup;
            }
            
            // Set up next joint position
            yOffset = segmentLength;
            currentGroup = jointGroup;
        }
        
        return fingerGroup;
    }
    
    /**
     * Calculate segment lengths for finger
     */
    calculateSegmentLengths(totalLength, isThumb) {
        const ratios = this.handProportions.segmentRatios;
        
        if (isThumb) {
            return [
                totalLength * 0.6,  // Thumb base
                totalLength * 0.4   // Thumb tip
            ];
        } else {
            return [
                totalLength * ratios.proximal,  // Base segment
                totalLength * ratios.middle,    // Middle segment
                totalLength * ratios.distal     // Tip segment
            ];
        }
    }
    
    /**
     * Create individual finger segment with enhanced curved tubes and natural tapering
     */
    createFingerSegment(length, thickness, material, isTip = false) {
        // Create more sophisticated finger curve with natural bend
        const curve = this.createAdvancedFingerCurve(length, thickness, isTip);
        
        // Create tube geometry with variable radius for natural tapering
        const tubeGeometry = this.createTaperedTubeGeometry(curve, thickness, isTip);
        
        // Apply organic deformation for natural appearance
        this.applyOrganicDeformation(tubeGeometry, length, thickness);
        
        // Optimize geometry for performance
        this.optimizeGeometry(tubeGeometry);
        
        // Add fingertip rounding for tip segments
        if (isTip) {
            this.addEnhancedFingertipRounding(tubeGeometry, length, thickness);
        }
        
        tubeGeometry.computeVertexNormals();
        
        const segment = new THREE.Mesh(tubeGeometry, material);
        segment.castShadow = true;
        segment.receiveShadow = true;
        
        // Add fingernail for tip segments
        if (isTip) {
            this.addRealisticFingernail(segment, length, thickness);
        }
        
        return segment;
    }
    
    /**
     * Create advanced finger curve with natural bending points
     */
    createAdvancedFingerCurve(length, thickness, isTip) {
        const controlPoints = [];
        
        // Base point
        controlPoints.push(new THREE.Vector3(0, 0, 0));
        
        // Natural finger curve points with anatomical accuracy
        controlPoints.push(new THREE.Vector3(0, length * 0.25, thickness * 0.05)); // Slight forward curve
        controlPoints.push(new THREE.Vector3(0, length * 0.6, thickness * 0.08));  // Natural arch
        controlPoints.push(new THREE.Vector3(0, length * 0.85, thickness * 0.05)); // Pre-tip curve
        
        if (isTip) {
            // Fingertip curves back naturally
            controlPoints.push(new THREE.Vector3(0, length, -thickness * 0.02));
        } else {
            controlPoints.push(new THREE.Vector3(0, length, 0));
        }
        
        return new THREE.CatmullRomCurve3(controlPoints);
    }
    
    /**
     * Create tapered tube geometry with variable radius
     */
    createTaperedTubeGeometry(curve, baseThickness, isTip) {
        const segments = 16; // Increased for smoother curves
        const radialSegments = 12; // Increased for rounder appearance
        
        // Create custom tube geometry with tapering
        const points = curve.getPoints(segments);
        const geometry = new THREE.BufferGeometry();
        
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        
        for (let i = 0; i <= segments; i++) {
            const point = points[i];
            const t = i / segments;
            
            // Calculate taper factor - fingers get thinner toward tips
            let radiusFactor;
            if (isTip) {
                // More dramatic tapering for fingertips
                radiusFactor = 1 - (t * t * 0.6); // Quadratic tapering
            } else {
                // Gentle tapering for middle segments
                radiusFactor = 1 - (t * 0.3); // Linear tapering
            }
            
            const radius = baseThickness * radiusFactor;
            
            // Get tangent for proper orientation
            const tangent = curve.getTangent(t);
            
            // Create perpendicular vectors for the circular cross-section
            const up = new THREE.Vector3(0, 1, 0);
            if (Math.abs(tangent.dot(up)) > 0.99) {
                up.set(1, 0, 0); // Use different up vector if tangent is too aligned
            }
            
            const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
            const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();
            
            // Create vertices in a circle around the point
            for (let j = 0; j < radialSegments; j++) {
                const angle = (j / radialSegments) * Math.PI * 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                
                const vertex = new THREE.Vector3()
                    .addScaledVector(normal, cos * radius)
                    .addScaledVector(binormal, sin * radius)
                    .add(point);
                
                vertices.push(vertex.x, vertex.y, vertex.z);
                
                // Calculate normal for lighting
                const vertexNormal = new THREE.Vector3()
                    .addScaledVector(normal, cos)
                    .addScaledVector(binormal, sin)
                    .normalize();
                
                normals.push(vertexNormal.x, vertexNormal.y, vertexNormal.z);
                
                // UV coordinates
                uvs.push(j / radialSegments, t);
            }
        }
        
        // Create indices for triangles
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < radialSegments; j++) {
                const a = i * radialSegments + j;
                const b = i * radialSegments + ((j + 1) % radialSegments);
                const c = (i + 1) * radialSegments + j;
                const d = (i + 1) * radialSegments + ((j + 1) % radialSegments);
                
                // Two triangles per quad
                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }
        
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        
        return geometry;
    }
    
    /**
     * Apply organic deformation for natural finger appearance
     */
    applyOrganicDeformation(geometry, length, thickness) {
        const positions = geometry.attributes.position.array;
        const noiseScale = 0.03;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Apply subtle noise for organic variation
            const noise1 = (Math.sin(x * 15 + y * 10) + Math.sin(z * 12)) * noiseScale;
            const noise2 = (Math.cos(x * 8 + z * 6) + Math.cos(y * 14)) * noiseScale;
            
            // Add asymmetry for natural look
            positions[i] += noise1 * thickness;
            positions[i + 2] += noise2 * thickness;
            
            // Add subtle finger joint bulges
            const jointFactor = Math.sin((y / length) * Math.PI * 3) * 0.02;
            const distance = Math.sqrt(x * x + z * z);
            const bulge = Math.max(0, jointFactor * (thickness - distance));
            
            if (distance > 0) {
                positions[i] += (x / distance) * bulge;
                positions[i + 2] += (z / distance) * bulge;
            }
        }
        
        geometry.attributes.position.needsUpdate = true;
    }
    
    /**
     * Apply palm-specific deformation for natural curvature
     */
    applyPalmDeformation(geometry) {
        const positions = geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Add subtle palm lines and texture variations
            const palmLineNoise = Math.sin(x * 12 + z * 8) * 0.005;
            const crossLineNoise = Math.cos(z * 15 + x * 5) * 0.003;
            
            positions[i + 1] += palmLineNoise + crossLineNoise;
            
            // Add natural asymmetry
            const asymmetryFactor = x * 0.01;
            positions[i + 1] += asymmetryFactor;
        }
        
        geometry.attributes.position.needsUpdate = true;
    }
    
    /**
     * Add enhanced realistic fingertip rounding with better shape
     */
    addEnhancedFingertipRounding(geometry, length, thickness) {
        const positions = geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Enhanced tip rounding with natural fingertip shape
            if (y > length * 0.8) {
                const factor = (y - length * 0.8) / (length * 0.2);
                const distance = Math.sqrt(x * x + z * z);
                
                // Create natural dome shape for fingertip
                const roundFactor = Math.sin(factor * Math.PI * 0.5);
                const domeHeight = thickness * 0.3 * roundFactor;
                
                // Apply rounding in both radial and Y directions
                if (distance > 0) {
                    const radialReduction = roundFactor * 0.4;
                    positions[i] *= (1 - radialReduction);     // x
                    positions[i + 2] *= (1 - radialReduction); // z
                }
                
                // Add dome height to create natural fingertip bulge
                positions[i + 1] += domeHeight;
            }
        }
        
        geometry.attributes.position.needsUpdate = true;
    }
    
    /**
     * Add realistic fingernail to tip segments with better shape and materials
     */
    addRealisticFingernail(segment, length, thickness) {
        // Create more realistic nail geometry using an ellipse shape
        const nailShape = new THREE.Shape();
        const nailWidth = thickness * 0.8;
        const nailHeight = thickness * 0.6;
        
        // Create nail outline with natural curvature
        nailShape.ellipse(0, 0, nailWidth, nailHeight, 0, Math.PI * 2, false, 0);
        
        const extrudeSettings = {
            depth: thickness * 0.05,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: thickness * 0.02,
            bevelThickness: thickness * 0.01
        };
        
        const nailGeometry = new THREE.ExtrudeGeometry(nailShape, extrudeSettings);
        
        // Enhanced nail material with subtle translucency
        const nailMaterial = new THREE.MeshPhongMaterial({
            color: 0xf8f5f0,
            shininess: 80,
            transparent: true,
            opacity: 0.95,
            specular: 0x444444
        });
        
        const nail = new THREE.Mesh(nailGeometry, nailMaterial);
        nail.position.set(0, length * 0.85, thickness * 0.4);
        nail.rotation.x = Math.PI * 0.3;
        nail.rotation.z = Math.PI * 0.5;
        nail.scale.set(0.9, 1.1, 1);
        nail.castShadow = true;
        
        segment.add(nail);
    }
    
    /**
     * Get anatomically correct finger positions for each hand
     */
    getFingerPositions(handSide) {
        const basePositions = {
            thumb: {
                position: new THREE.Vector3(-0.35, 0.15, 0.3),
                rotation: new THREE.Euler(0, 0, Math.PI * 0.3)
            },
            index: {
                position: new THREE.Vector3(-0.25, 0.15, -0.5),
                rotation: new THREE.Euler(0, 0, 0)
            },
            middle: {
                position: new THREE.Vector3(-0.05, 0.15, -0.6),
                rotation: new THREE.Euler(0, 0, 0)
            },
            ring: {
                position: new THREE.Vector3(0.15, 0.15, -0.55),
                rotation: new THREE.Euler(0, 0, 0)
            },
            pinky: {
                position: new THREE.Vector3(0.32, 0.15, -0.4),
                rotation: new THREE.Euler(0, 0, 0)
            }
        };
        
        // Mirror positions for left hand
        if (handSide === 'left') {
            Object.keys(basePositions).forEach(fingerName => {
                basePositions[fingerName].position.x *= -1;
                basePositions[fingerName].rotation.z *= -1;
            });
        }
        
        return basePositions;
    }
    
    /**
     * Add subtle hand details like knuckles and palm lines
     */
    addHandDetails(handGroup, material) {
        // Add knuckle bumps
        const knuckleGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const knucklePositions = [
            new THREE.Vector3(-0.25, 0.12, -0.45), // Index knuckle
            new THREE.Vector3(-0.05, 0.12, -0.55), // Middle knuckle
            new THREE.Vector3(0.15, 0.12, -0.5),   // Ring knuckle
            new THREE.Vector3(0.32, 0.12, -0.35)   // Pinky knuckle
        ];
        
        knucklePositions.forEach(pos => {
            const knuckle = new THREE.Mesh(knuckleGeometry, material);
            knuckle.position.copy(pos);
            knuckle.scale.set(1, 0.5, 0.8);
            knuckle.castShadow = true;
            handGroup.add(knuckle);
        });
        
        // Add wrist connection
        const wristGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.4, 12);
        const wrist = new THREE.Mesh(wristGeometry, material);
        wrist.position.set(0, -0.3, -0.45);
        wrist.rotation.x = Math.PI * 0.1;
        wrist.castShadow = true;
        wrist.receiveShadow = true;
        handGroup.add(wrist);
    }
    
    /**
     * Optimize geometry for better performance
     */
    optimizeGeometry(geometry) {
        try {
            // Use BufferGeometryUtils for newer THREE.js versions (r125+)
            if (typeof THREE !== 'undefined' && THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeVertices) {
                console.log('Using BufferGeometryUtils.mergeVertices');
                geometry = THREE.BufferGeometryUtils.mergeVertices(geometry);
            } else if (geometry.mergeVertices && typeof geometry.mergeVertices === 'function') {
                // Fallback for older versions that had mergeVertices as a method
                console.log('Using geometry.mergeVertices');
                geometry.mergeVertices();
            } else {
                console.log('No vertex merging available - continuing without optimization');
            }
        } catch (error) {
            console.warn('Vertex merging failed, continuing without optimization:', error);
        }
        
        // Compute vertex normals for smooth shading
        geometry.computeVertexNormals();
        
        // Compute bounding sphere for frustum culling
        geometry.computeBoundingSphere();
        
        return geometry;
    }
    
    /**
     * Smooth geometry for more organic appearance
     */
    smoothGeometry(geometry, factor = 0.5) {
        const positions = geometry.attributes.position.array;
        const smoothedPositions = new Float32Array(positions.length);
        
        // Simple smoothing algorithm
        for (let i = 0; i < positions.length; i += 3) {
            let sumX = 0, sumY = 0, sumZ = 0;
            let count = 0;
            
            // Average with neighboring vertices
            for (let j = Math.max(0, i - 9); j < Math.min(positions.length, i + 12); j += 3) {
                sumX += positions[j];
                sumY += positions[j + 1];
                sumZ += positions[j + 2];
                count++;
            }
            
            // Blend original with smoothed
            smoothedPositions[i] = positions[i] * (1 - factor) + (sumX / count) * factor;
            smoothedPositions[i + 1] = positions[i + 1] * (1 - factor) + (sumY / count) * factor;
            smoothedPositions[i + 2] = positions[i + 2] * (1 - factor) + (sumZ / count) * factor;
        }
        
        geometry.attributes.position.array = smoothedPositions;
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
    }
    
    /**
     * Create enhanced material for realistic hand rendering with skin-like properties
     */
    createHandMaterial() {
        // Create procedural skin texture
        const skinTexture = this.createProceduralSkinTexture();
        const normalTexture = this.createSkinNormalTexture();
        
        return new THREE.MeshPhongMaterial({
            color: 0xfdbcb4,
            shininess: 25,
            transparent: false,
            opacity: 1.0,
            side: THREE.FrontSide,
            
            // Apply procedural skin textures
            map: skinTexture,
            normalMap: normalTexture,
            normalScale: new THREE.Vector2(0.3, 0.3),
            
            // Enhanced skin-like properties
            specular: 0x221100,
            shininess: 20,
            
            // Subsurface scattering approximation for warm skin tone
            emissive: new THREE.Color(0x2a1810),
            emissiveIntensity: 0.03,
            
            // Add subtle bumpiness
            bumpScale: 0.01
        });
    }
    
    /**
     * Create procedural skin texture with natural variation
     */
    createProceduralSkinTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // Base skin color gradient
        const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, '#fdc4b0');    // Lighter center
        gradient.addColorStop(0.7, '#fdbcb4');  // Base skin tone
        gradient.addColorStop(1, '#e8a899');    // Darker edges
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 512, 512);
        
        // Add skin texture noise
        this.addSkinTextureNoise(context, 512, 512);
        
        // Add subtle color variations
        this.addSkinColorVariations(context, 512, 512);
        
        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        
        return texture;
    }
    
    /**
     * Add realistic skin texture noise
     */
    addSkinTextureNoise(context, width, height) {
        const imageData = context.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            
            // Multi-octave noise for skin texture
            const noise1 = Math.sin(x * 0.1 + y * 0.08) * 8;
            const noise2 = Math.sin(x * 0.05 + y * 0.12) * 12;
            const noise3 = Math.random() * 6 - 3;
            
            const totalNoise = noise1 + noise2 + noise3;
            
            // Apply noise to all color channels
            data[i] = Math.max(0, Math.min(255, data[i] + totalNoise));     // Red
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + totalNoise)); // Green
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + totalNoise)); // Blue
        }
        
        context.putImageData(imageData, 0, 0);
    }
    
    /**
     * Add subtle skin color variations (freckles, blemishes)
     */
    addSkinColorVariations(context, width, height) {
        // Add subtle spots and variations
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 3 + 1;
            const opacity = Math.random() * 0.3 + 0.1;
            
            // Slightly darker spots
            context.fillStyle = `rgba(200, 150, 130, ${opacity})`;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
        
        // Add very subtle lighter spots
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 2 + 0.5;
            const opacity = Math.random() * 0.2 + 0.05;
            
            context.fillStyle = `rgba(255, 220, 200, ${opacity})`;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
    }
    
    /**
     * Create normal map texture for skin surface detail
     */
    createSkinNormalTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Fill with neutral normal color
        context.fillStyle = '#8080ff';
        context.fillRect(0, 0, 256, 256);
        
        // Add skin pore details
        const imageData = context.getImageData(0, 0, 256, 256);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % 256;
            const y = Math.floor((i / 4) / 256);
            
            // Create subtle normal variations for skin texture
            const normalX = Math.sin(x * 0.2 + y * 0.15) * 8 + 128;
            const normalY = Math.cos(x * 0.15 + y * 0.2) * 8 + 128;
            const normalZ = 255; // Always pointing outward
            
            data[i] = Math.max(0, Math.min(255, normalX));     // X component (red)
            data[i + 1] = Math.max(0, Math.min(255, normalY)); // Y component (green)  
            data[i + 2] = normalZ;                             // Z component (blue)
            data[i + 3] = 255;                                 // Alpha
        }
        
        context.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        return texture;
    }
    
    /**
     * Create a complete enhanced hand with all improvements
     * This is a convenience method that incorporates all enhancements
     */
    createEnhancedHand(handSide, customMaterial = null) {
        // Use enhanced material if none provided
        const material = customMaterial || this.createHandMaterial();
        
        // Create the hand using the existing method (which now uses all enhancements)
        const hand = this.createRealisticHand(handSide, material);
        
        // Add any final enhancements
        hand.userData.enhanced = true;
        hand.userData.version = '2.0';
        
        return hand;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealisticHandGeometry;
} else {
    window.RealisticHandGeometry = RealisticHandGeometry;
}