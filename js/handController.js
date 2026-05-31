/**
 * Hand Controller - Manages 3D hand animations and finger positions
 * 
 * This class handles the complex animations and positioning of 3D hand models,
 * providing smooth transitions between different finger positions for mathematical
 * calculations.
 */

class HandController {
    constructor(leftHand, rightHand) {
        this.leftHand = leftHand;
        this.rightHand = rightHand;
        
        // Animation properties
        this.animationSpeed = 0.1;
        this.targetPositions = {
            left: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
            right: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 }
        };
        
        this.currentPositions = {
            left: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
            right: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 }
        };

        // Debug-adjustable splay degrees (how far apart fingers spread when extended)
        // Defaults match previous behavior
        this.splayDegrees = {
            left:  { thumb: 0, index: 5, middle: 0, ring: -5, pinky: -7 },
            right: { thumb: 0, index: 5, middle: 0, ring: -5, pinky: -7 }
        };
        
        // Finger bend angles (in radians)
        this.fingerBendAngles = {
            closed: {
                base: Math.PI * 0.4,    // 72 degrees
                middle: Math.PI * 0.6,  // 108 degrees
                tip: Math.PI * 0.5      // 90 degrees
            },
            open: {
                base: 0,
                middle: 0,
                tip: 0
            }
        };
        
        // Special angles for thumb (different joint structure)
        this.thumbAngles = {
            closed: {
                base: Math.PI * 0.3,
                middle: Math.PI * 0.4,
                tip: Math.PI * 0.3
            },
            open: {
                base: 0,
                middle: 0,
                tip: 0
            }
        };
        
        // Initialize hand positions
        this.initializeHands();
        
        // Set up GLTF model compatibility (original behavior)
        this.setupGLTFCompatibility();
    }
    
    /**
     * Initialize both hands to default positions
     */
    initializeHands() {
        // Set all fingers to closed position initially (0 = closed, 1 = open)
        const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
        
        ['left', 'right'].forEach(handSide => {
            fingers.forEach(finger => {
                // Set to closed position and store in current positions
                this.targetPositions[handSide][finger] = 0;
                this.currentPositions[handSide][finger] = 0;
            });
        });
    }
    
    /**
     * Set up GLTF model compatibility and ensure proper skeleton binding
     */
    setupGLTFCompatibility() {
        // Ensure both hands have proper skeleton setup
        [this.leftHand, this.rightHand].forEach(hand => {
            if (hand) {
                // CRITICAL: Detect initial GLTF finger positions
                this.detectGLTFInitialState(hand);

                // If GLTF didn’t populate finger structure, build it from bone names
                if (!hand.userData.fingers || Object.keys(hand.userData.fingers).length === 0) {
                    if (typeof window !== 'undefined' && typeof window.buildBoneMapForHand === 'function') {
                        this._log('info','🔧 Building bone map for hand via GLTF names');
                        window.buildBoneMapForHand(hand);
                    } else {
                        this._log('warn','Bone map helper not available; ensure js/handBoneMap.js is loaded');
                    }
                }

                // Initialize skeleton and set to bind pose first, so 'rest' = bind/open
                this.updateHandSkeleton(hand);
                hand.traverse((child) => {
                    if (child.isSkinnedMesh && child.skeleton) {
                        child.skeleton.pose();
                        this._log('info','GLTF skinned mesh initialized (posed to bind):', child.name);
                    }
                });

                // Cache rest quaternions for quaternion-based control AFTER bind pose
                this.cacheRestQuaternions(hand);

                // CRITICAL: Apply closed fist pose to override GLTF initial state
                this.forceClosedFistPose(hand);
            }
        });
    }

    /**
     * Cache initial rest quaternions for each mapped finger bone
     */
    cacheRestQuaternions(hand) {
        if (!hand || !hand.userData || !hand.userData.fingers) return;
        if (hand.userData._restCached) {
            console.log('ℹ️ Rest quaternions already cached; skipping');
            return;
        }
        Object.values(hand.userData.fingers).forEach(f => {
            const container = f && f.userData ? f.userData : f; // support both shapes
            ['base','middle','tip'].forEach(k => {
                const b = container && container[k];
                if (b && b.quaternion) {
                    b.userData = b.userData || {};
                    if (!b.userData.restQuaternion) {
                        b.userData.restQuaternion = b.quaternion.clone();
                    }
                }
            });
        });
        hand.userData._restCached = true;
        this._log('info','✅ Rest quaternions cached for hand');
    }
    
    /**
     * Set target position for a specific finger
     * @param {string} hand - 'left' or 'right'
     * @param {string} finger - finger name
     * @param {number} position - 0 (closed) to 1 (open)
     */
    setFingerPosition(hand, finger, position) {
        if (!this.targetPositions[hand] || this.targetPositions[hand][finger] === undefined) {
            console.warn(`Invalid hand (${hand}) or finger (${finger})`);
            return;
        }
        
        // Clamp position between 0 and 1
        this.targetPositions[hand][finger] = Math.max(0, Math.min(1, position));
    }
    
    /**
     * Immediately set finger to specific position with anatomical accuracy (no animation)
     * @param {string} handSide - 'left' or 'right'
     * @param {string} fingerName - finger name
     * @param {number} position - 0 (closed) to 1 (open)
     */
    setFingerToPositionAnatomical(handSide, fingerName, position) {
        const hand = handSide === 'left' ? this.leftHand : this.rightHand;
        if (!hand) {
            console.warn(`Hand not found: ${handSide}`);
            return;
        }
        
        // Get the properly structured finger from the hand setup
        const finger = hand.userData.fingers && hand.userData.fingers[fingerName];
        
        if (!finger) {
            console.warn(`❌ Finger not found: ${handSide} ${fingerName}`);
            console.log(`Available hand.userData:`, Object.keys(hand.userData));
            if (hand.userData.fingers) {
                console.log(`Available fingers:`, Object.keys(hand.userData.fingers));
            }
            return;
        }
        
        this._log('debug',`🦴 Setting ${handSide} ${fingerName} to position ${position} (${position === 0 ? 'CLOSED' : position === 1 ? 'OPEN' : 'PARTIAL'})`);
        
        const isThumb = fingerName === 'thumb';
        // Prefer quaternion-based articulation when rest quaternions exist
        const hasRest = !!(finger.userData.base?.userData?.restQuaternion ||
                           finger.userData.middle?.userData?.restQuaternion ||
                           finger.userData.tip?.userData?.restQuaternion);
        // Splay: apply at base joint as small yaw/roll; scale by openness (position)
        const splayDeg = (this.splayDegrees?.[handSide]?.[fingerName] || 0) * (position || 0);
        if (hasRest) {
            this._log('debug',`🟣 QPATH (anatomical): ${handSide} ${fingerName} pos=${position}`);
            this.applyQuaternionCurl(finger, fingerName, position, isThumb, splayDeg);
        } else {
            // Fallback to previous Euler-based method
            this._log('debug',`🟠 EULER (anatomical fallback): ${handSide} ${fingerName} pos=${position}`);
            this.applyVisibleFingerRotation(finger, fingerName, position, isThumb);
        }
        this.updateHandSkeleton(hand);
        
        // Update current position
        this.currentPositions[handSide][fingerName] = position;
    }

    /**
     * Apply curl using quaternions relative to the rest orientation
     */
    applyQuaternionCurl(finger, fingerName, position, isThumb, splayDeg = 0) {
        // Calibrated slerp path: if closed quaternions exist, slerp rest -> closed by (1 - position)
        const splayRad = (splayDeg || 0) * Math.PI / 180;
        const hasClosed = !!(finger?.userData?.closedQ);
        if (hasClosed) {
            const t = 1 - Math.max(0, Math.min(1, position));
            // Phase 2.3: Apply smooth sine-in-out easing for slerp progression
            const tEased = (1 - Math.cos(t * Math.PI)) / 2;

            const applySlerp = (bone, closedQ, applySplay=false) => {
                if (!bone?.userData?.restQuaternion || !closedQ) return;
                const restQ = bone.userData.restQuaternion;
                const target = restQ.clone().slerp(closedQ, tEased);

                let activeSplayRad = splayRad;
                if (isThumb && applySplay) {
                    // Smoothly blend an outward splay offset of -8 degrees during clenched poses to prevent thumb-index clipping
                    const clenchOffsetDeg = -8 * tEased;
                    activeSplayRad += clenchOffsetDeg * Math.PI / 180;
                }

                if (applySplay && activeSplayRad) {
                    const qS = new THREE.Quaternion();
                    qS.setFromAxisAngle(new THREE.Vector3(0,1,0), activeSplayRad);
                    target.multiply(qS);
                }
                bone.quaternion.copy(target);
            };
            applySlerp(finger.userData.base, finger.userData.closedQ.base, true);
            applySlerp(finger.userData.middle, finger.userData.closedQ.middle, false);
            applySlerp(finger.userData.tip, finger.userData.closedQ.tip, false);
            return;
        }

        // Fallback: anatomical angles with Step A axis alignment
        const angles = this.getAnatomicalAngles(fingerName, position);
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        const caps = isThumb
            ? { base: Math.PI*0.33, middle: Math.PI*0.39, tip: Math.PI*0.28 }
            : { base: Math.PI*0.5,  middle: Math.PI*0.55,  tip: Math.PI*0.44 };
        angles.base   = clamp(Math.abs(angles.base),   0, caps.base);
        angles.middle = clamp(Math.abs(angles.middle), 0, caps.middle);
        angles.tip    = clamp(Math.abs(angles.tip),    0, caps.tip);

        if (position >= 0.99) {
            angles.base = angles.middle = angles.tip = 0;
        }

        const applyJoint = (bone, primaryAxis, angle, blendAxes, preMul) => {
            if (!bone || !bone.userData?.restQuaternion) return;
            const restQ = bone.userData.restQuaternion;
            const target = restQ.clone();
            const q = new THREE.Quaternion();
            const ax = new THREE.Vector3(1,0,0);
            const ay = new THREE.Vector3(0,1,0);
            const az = new THREE.Vector3(0,0,1);
            if (preMul && preMul.length) {
                preMul.forEach(({ axis, ang }) => {
                    let v = az; if (axis === 'x') v = ax; else if (axis === 'y') v = ay;
                    q.setFromAxisAngle(v, ang);
                    target.multiply(q);
                });
            }
            if (blendAxes && blendAxes.length) {
                blendAxes.forEach(({ axis, ang }) => {
                    let v = az;
                    if (axis === 'x') v = ax; else if (axis === 'y') v = ay; else v = az;
                    q.setFromAxisAngle(v, ang);
                    target.multiply(q);
                });
            } else {
                let v = az;
                if (primaryAxis === 'x') v = ax; else if (primaryAxis === 'y') v = ay; else v = az;
                q.setFromAxisAngle(v, angle);
                target.multiply(q);
            }
            bone.quaternion.copy(target);
        };

        if (!isThumb) {
            applyJoint(finger.userData.base,   'x',  angles.base,   [{ axis: 'y', ang: angles.base*0.30 }], [{ axis: 'y', ang: splayRad }]);
            applyJoint(finger.userData.middle, 'x',  angles.middle, [{ axis: 'y', ang: angles.middle*0.20 }]);
            applyJoint(finger.userData.tip,    'x',  angles.tip,    [{ axis: 'y', ang: angles.tip*0.10 }]);
        } else {
            applyJoint(finger.userData.base,   'x',  angles.base*0.6, [{ axis: 'z', ang: angles.base*0.4 }], [{ axis: 'y', ang: splayRad }]);
            applyJoint(finger.userData.middle, 'x',  angles.middle*0.8, [{ axis: 'z', ang: angles.middle*0.2 }]);
            applyJoint(finger.userData.tip,    'x',  angles.tip*0.9, [{ axis: 'z', ang: angles.tip*0.1 }]);
        }
    }

    /**
     * Update splay degrees for a finger (in degrees), then reapply current pose
     */
    setSplayDegrees(handSide, fingerName, degrees) {
        if (!this.splayDegrees[handSide]) return;
        if (!['thumb','index','middle','ring','pinky'].includes(fingerName)) return;
        // Clamp to a sensible range
        const clamped = Math.max(-25, Math.min(25, Number(degrees) || 0));
        this.splayDegrees[handSide][fingerName] = clamped;
        this.reapplyImmediatePose(handSide);
    }

    /**
     * Reapply current positions immediately (useful after debug splay changes)
     */
    reapplyImmediatePose(handSide) {
        const fingers = ['thumb','index','middle','ring','pinky'];
        fingers.forEach(name => {
            const pos = this.currentPositions[handSide]?.[name];
            if (typeof pos === 'number') {
                this.setFingerToPositionImmediate(handSide, name, pos);
            }
        });
        const hand = handSide === 'left' ? this.leftHand : this.rightHand;
        if (hand) this.updateHandSkeleton(hand);
    }

    /**
     * Get anatomically accurate angles with natural movement constraints
     * @param {string} fingerName - finger name
     * @param {number} position - 0 (closed) to 1 (open)
     * @returns {Object} angles with base, middle, tip properties
     */
    getAnatomicalAngles(fingerName, position) {
        const isThumb = fingerName === 'thumb';
        
        // Anatomical movement limits (in radians)
        const anatomicalLimits = {
            finger: {
                closed: {
                    base: Math.PI * 0.5,     // 90 degrees maximum flexion
                    middle: Math.PI * 0.55,  // 100 degrees maximum flexion
                    tip: Math.PI * 0.44      // 80 degrees maximum flexion
                },
                open: {
                    base: -Math.PI * 0.05,   // Slight hyperextension possible
                    middle: 0,               // No hyperextension at middle joint
                    tip: 0                   // No hyperextension at tip joint
                }
            },
            thumb: {
                closed: {
                    base: Math.PI * 0.33,    // 60 degrees maximum flexion
                    middle: Math.PI * 0.39,  // 70 degrees maximum flexion  
                    tip: Math.PI * 0.28      // 50 degrees maximum flexion
                },
                open: {
                    base: -Math.PI * 0.08,   // More hyperextension for thumb
                    middle: -Math.PI * 0.03, // Slight hyperextension possible
                    tip: 0                   // No hyperextension at tip
                }
            }
        };
        
        const limits = isThumb ? anatomicalLimits.thumb : anatomicalLimits.finger;
        
        // Calculate anatomically constrained angles
        const bendFactor = 1 - position; // Invert: 0 = open, 1 = closed
        
        // Progressive curl: base moves first, then middle, then tip
        const progressiveBendFactors = this.calculateProgressiveBendFactors(bendFactor);
        
        return {
            base: this.lerp(limits.open.base, limits.closed.base, progressiveBendFactors.base),
            middle: this.lerp(limits.open.middle, limits.closed.middle, progressiveBendFactors.middle),
            tip: this.lerp(limits.open.tip, limits.closed.tip, progressiveBendFactors.tip)
        };
    }
    
    /**
     * Calculate progressive bend factors for natural joint sequencing
     * @param {number} bendFactor - overall bend factor (0-1)
     * @returns {Object} progressive factors for base, middle, tip
     */
    calculateProgressiveBendFactors(bendFactor) {
        // Natural finger curl sequence: base starts first, middle follows, tip completes
        let baseFactor, middleFactor, tipFactor;
        
        if (bendFactor <= 0.33) {
            // Phase 1: Base joint starts moving (0-33%)
            baseFactor = bendFactor * 3; // 0 to 1
            middleFactor = 0;
            tipFactor = 0;
        } else if (bendFactor <= 0.66) {
            // Phase 2: Base continues, middle joint starts (33-66%)
            baseFactor = 1;
            middleFactor = (bendFactor - 0.33) * 3; // 0 to 1
            tipFactor = 0;
        } else {
            // Phase 3: All joints active, tip completes curl (66-100%)
            baseFactor = 1;
            middleFactor = 1;
            tipFactor = (bendFactor - 0.66) * 3; // 0 to 1
        }
        
        // Ensure factors don't exceed 1.0
        return {
            base: Math.min(1.0, baseFactor),
            middle: Math.min(1.0, middleFactor),
            tip: Math.min(1.0, tipFactor)
        };
    }

    // Removed new axis-discovery and immediate update helpers to restore original behavior
    
    /**
     * Apply progressive joint movement with anatomical timing
     * @param {Object} finger - finger object with bone structure
     * @param {Object} angles - calculated anatomical angles
     * @param {boolean} isThumb - whether this is a thumb
     */
    applyProgressiveJointMovement(finger, angles, isThumb) {
        // Apply rotations to finger segments with realistic joint behavior
        if (finger.userData.base) {
            if (isThumb) {
                // Thumb has complex 3-axis movement (opposition, flexion, abduction)
                finger.userData.base.rotation.x = angles.base * 0.6;
                finger.userData.base.rotation.y = angles.base * 0.4; 
                finger.userData.base.rotation.z = angles.base * 0.3;
            } else {
                // CRITICAL FIX: Use much larger rotation values to make movement visible
                finger.userData.base.rotation.x = -angles.base * 2.0;  // Negative for proper curl direction, larger for visibility
                finger.userData.base.rotation.y = angles.base * 0.5;
                finger.userData.base.rotation.z = angles.base * 1.5;   // Primary finger curl axis
            }
        }
        
        if (finger.userData.middle && finger.userData.middle !== finger.userData.base) {
            if (isThumb) {
                finger.userData.middle.rotation.x = angles.middle * 0.8;
                finger.userData.middle.rotation.z = angles.middle * 0.2;
            } else {
                // Apply stronger rotations for middle joints
                finger.userData.middle.rotation.x = -angles.middle * 2.0;
                finger.userData.middle.rotation.y = angles.middle * 0.5;
                finger.userData.middle.rotation.z = angles.middle * 1.5;
            }
        }
        
        if (finger.userData.tip && finger.userData.tip !== finger.userData.base) {
            if (isThumb) {
                finger.userData.tip.rotation.x = angles.tip * 0.9;
                finger.userData.tip.rotation.z = angles.tip * 0.1;
            } else {
                // Apply stronger rotations for tip joints
                finger.userData.tip.rotation.x = -angles.tip * 2.0;
                finger.userData.tip.rotation.y = angles.tip * 0.5;
                finger.userData.tip.rotation.z = angles.tip * 1.5;
            }
        }
        
        // Log only when significant rotation is applied (reduce spam)
        if (this._logEnabled('debug') && (angles.base > 0.1 || angles.middle > 0.1 || angles.tip > 0.1)) {
            this._log('debug',`🦴 Applied rotation to ${finger.userData.base?.name?.split('_')[0]} finger:`, {
                base: (angles.base * 180 / Math.PI).toFixed(1) + '°',
                middle: (angles.middle * 180 / Math.PI).toFixed(1) + '°',
                tip: (angles.tip * 180 / Math.PI).toFixed(1) + '°'
            });
        }
    }

    /**
     * Legacy method - now calls anatomical version for backward compatibility
     * @param {string} handSide - 'left' or 'right'
     * @param {string} fingerName - finger name
     * @param {number} position - 0 (closed) to 1 (open)
     */
    setFingerToPosition(handSide, fingerName, position) {
        // Use the new anatomical version for all finger movements
        return this.setFingerToPositionAnatomical(handSide, fingerName, position);
    }

    /**
     * Direct finger positioning without progressive animation (for initial setup)
     * @param {string} handSide - 'left' or 'right'
     * @param {string} fingerName - finger name
     * @param {number} position - 0 (closed) to 1 (open)
     */
    setFingerToPositionDirect(handSide, fingerName, position) {
        const hand = handSide === 'left' ? this.leftHand : this.rightHand;
        if (!hand) {
            console.warn(`Hand not found: ${handSide}`);
            return;
        }
        
        const finger = hand.userData.fingers && hand.userData.fingers[fingerName];
        if (!finger) {
            console.warn(`❌ Finger not found: ${handSide} ${fingerName}`);
            return;
        }

        // Calculate rotation values for visibility (FIXED VALUES)
        const isThumb = fingerName === 'thumb';
        const closedAngle = isThumb ? Math.PI * 0.6 : Math.PI * 0.8; // Strong closure angle
        const bendFactor = 1 - position; // 1 = closed, 0 = open
        
        // CRITICAL FIX: Use much larger, more visible rotation values
        const baseAngle = closedAngle * bendFactor;
        const middleAngle = closedAngle * bendFactor * 1.2;
        const tipAngle = closedAngle * bendFactor * 0.8;

        // Apply rotations with FIXED AXES for maximum visibility
        if (finger.userData.base) {
            if (isThumb) {
                // Thumb uses different rotation pattern
                finger.userData.base.rotation.x = baseAngle * 0.5;
                finger.userData.base.rotation.y = baseAngle * 0.7;
                finger.userData.base.rotation.z = baseAngle * 0.8;
            } else {
                // Regular fingers - use Z-axis as primary curl axis
                finger.userData.base.rotation.x = 0;
                finger.userData.base.rotation.y = 0;
                finger.userData.base.rotation.z = baseAngle; // PRIMARY CURL AXIS
            }
        }

        if (finger.userData.middle && finger.userData.middle !== finger.userData.base) {
            if (isThumb) {
                finger.userData.middle.rotation.x = middleAngle * 0.8;
                finger.userData.middle.rotation.y = middleAngle * 0.3;
                finger.userData.middle.rotation.z = middleAngle * 0.6;
            } else {
                finger.userData.middle.rotation.x = 0;
                finger.userData.middle.rotation.y = 0;
                finger.userData.middle.rotation.z = middleAngle; // FOLLOW BASE CURL
            }
        }

        if (finger.userData.tip && finger.userData.tip !== finger.userData.base) {
            if (isThumb) {
                finger.userData.tip.rotation.x = tipAngle * 0.9;
                finger.userData.tip.rotation.y = tipAngle * 0.2;
                finger.userData.tip.rotation.z = tipAngle * 0.4;
            } else {
                finger.userData.tip.rotation.x = 0;
                finger.userData.tip.rotation.y = 0;
                finger.userData.tip.rotation.z = tipAngle; // COMPLETE CURL
            }
        }

        // Update current position
        this.currentPositions[handSide][fingerName] = position;
        
        // Log only for significant movements to reduce spam
        if (position !== 1) { // Only log when not fully open
            this._log('debug',`🦴 DIRECT: ${handSide} ${fingerName} → ${position === 0 ? 'CLOSED' : 'POSITION ' + position}`);
        }
    }
    /**
     * Detect and store initial GLTF finger positions for proper baseline
     * @param {Object} hand - hand model object
     */
    detectGLTFInitialState(hand) {
        if (!hand || !hand.userData.fingers) {
            console.warn('Cannot detect GLTF initial state - no finger structure');
            return;
        }

        const handSide = hand.userData.side || (hand === this.leftHand ? 'left' : 'right');
        this._log('info',`🔍 Detecting GLTF initial state for ${handSide} hand`);

        // Store initial bone rotations as baseline
        Object.keys(hand.userData.fingers).forEach(fingerName => {
            const finger = hand.userData.fingers[fingerName];
            if (finger && finger.userData) {
                // Store initial rotations for all bone segments
                ['base', 'middle', 'tip'].forEach(segment => {
                    if (finger.userData[segment]) {
                        const bone = finger.userData[segment];
                        // Store initial rotation as rest pose
                        bone.userData = bone.userData || {};
                        bone.userData.initialRotation = {
                            x: bone.rotation.x,
                            y: bone.rotation.y,
                            z: bone.rotation.z
                        };
                        this._log('debug',`📍 Initial ${fingerName} ${segment}:`, {
                            name: bone.name,
                            rotation: {
                                x: (bone.rotation.x * 180 / Math.PI).toFixed(1) + '°',
                                y: (bone.rotation.y * 180 / Math.PI).toFixed(1) + '°',
                                z: (bone.rotation.z * 180 / Math.PI).toFixed(1) + '°'
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * Force all fingers to closed fist pose to override GLTF initial state
     * @param {Object} hand - hand model object
     */
    forceClosedFistPose(hand) {
        if (!hand || !hand.userData.fingers) {
            console.warn('Cannot force closed fist - no finger structure');
            return;
        }

        const handSide = hand.userData.side || (hand === this.leftHand ? 'left' : 'right');
        this._log('info',`✊ Forcing closed fist pose for ${handSide} hand`);

        // Apply closed fist to all fingers
        Object.keys(hand.userData.fingers).forEach(fingerName => {
            this.setFingerToPositionDirect(handSide, fingerName, 0); // 0 = closed
        });

        // Update skeleton to apply changes
        this.updateHandSkeleton(hand);
        
        this._log('info',`✅ ${handSide} hand forced to closed fist position`);
    }

    /**
     * Force all fingers on both hands to closed fist position
     * Used to override GLTF initial state
     */
    forceAllFingersToClosedFist() {
        this._log('info','✊ FORCING ALL FINGERS TO CLOSED FIST POSITION');
        
        ['left', 'right'].forEach(handSide => {
            const hand = handSide === 'left' ? this.leftHand : this.rightHand;
            if (hand) {
                this.forceClosedFistPose(hand);
                // Capture calibrated closed quaternions for all fingers on this hand
                this.captureClosedPoseForHand(handSide);
            }
        });
        
        this._log('info','✅ All hands forced to closed fist - ready for finger patterns');
    }
        
    /**
     * Apply visible finger rotation with improved axis control
     * @param {Object} finger - finger object with bone structure
     * @param {string} fingerName - name of the finger
     * @param {number} position - 0 (closed) to 1 (open)
     * @param {boolean} isThumb - whether this is a thumb
     */
    applyVisibleFingerRotation(finger, fingerName, position, isThumb) {
        // Calculate bend factor (1 = fully closed, 0 = fully open)
        const bendFactor = 1 - position;
        
        // Use anatomically realistic angles
        const { base: baseAngle, middle: middleAngle, tip: tipAngle } = this.getAnatomicalAngles(fingerName, position);
        
        // SYSTEMATIC ROTATION AXIS TESTING - Try different axes for visibility
        if (finger.userData.base) {
            if (isThumb) {
                // Thumb opposition movement
                finger.userData.base.rotation.x = baseAngle * 0.6;
                finger.userData.base.rotation.y = baseAngle * 0.8;
                finger.userData.base.rotation.z = baseAngle * 0.5;
            } else {
                // Primary curl on Z for this rig
                finger.userData.base.rotation.x = 0;
                finger.userData.base.rotation.y = 0;
                finger.userData.base.rotation.z = baseAngle;
            }
        }
        
        if (finger.userData.middle && finger.userData.middle !== finger.userData.base) {
            if (isThumb) {
                finger.userData.middle.rotation.x = middleAngle * 0.8;
                finger.userData.middle.rotation.y = middleAngle * 0.5;
                finger.userData.middle.rotation.z = middleAngle * 0.6;
            } else {
                finger.userData.middle.rotation.x = 0;
                finger.userData.middle.rotation.y = 0;
                finger.userData.middle.rotation.z = middleAngle;
            }
        }
        
        if (finger.userData.tip && finger.userData.tip !== finger.userData.base) {
            if (isThumb) {
                finger.userData.tip.rotation.x = tipAngle * 0.9;
                finger.userData.tip.rotation.y = tipAngle * 0.3;
                finger.userData.tip.rotation.z = tipAngle * 0.7;
            } else {
                finger.userData.tip.rotation.x = 0;
                finger.userData.tip.rotation.y = 0;
                finger.userData.tip.rotation.z = tipAngle;
            }
        }
        
        console.log(`🔄 ${fingerName} rotation applied:`, {
            position: position,
            bendFactor: bendFactor.toFixed(2),
            baseAngle: (baseAngle * 180 / Math.PI).toFixed(1) + '°',
            middleAngle: (middleAngle * 180 / Math.PI).toFixed(1) + '°',
            tipAngle: (tipAngle * 180 / Math.PI).toFixed(1) + '°'
        });
    }

    /**
     * Validate if a finger position is anatomically possible
     * @param {string} fingerName - finger name
     * @param {number} position - 0 (closed) to 1 (open)
     * @returns {boolean} true if position is anatomically valid
     */
    validateAnatomicalPosition(fingerName, position) {
        if (position < 0 || position > 1.05) { // Allow slight over-extension
            return false;
        }
        
        const angles = this.getAnatomicalAngles(fingerName, position);
        
        // Check if any angle exceeds anatomical limits
        const maxFlexion = fingerName === 'thumb' ? Math.PI * 0.4 : Math.PI * 0.6;
        const maxExtension = fingerName === 'thumb' ? -Math.PI * 0.1 : -Math.PI * 0.08;
        
        return (
            angles.base >= maxExtension && angles.base <= maxFlexion &&
            angles.middle >= maxExtension && angles.middle <= maxFlexion &&
            angles.tip >= maxExtension && angles.tip <= maxFlexion
        );
    }
    
    /**
     * Get anatomical feedback for current finger positions
     * @param {string} handSide - 'left' or 'right'
     * @returns {Object} anatomical feedback with validity and issues
     */
    getAnatomicalFeedback(handSide) {
        const feedback = {
            isValid: true,
            issues: [],
            handSide: handSide
        };
        
        const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
        
        fingers.forEach(fingerName => {
            const position = this.currentPositions[handSide][fingerName];
            const isValid = this.validateAnatomicalPosition(fingerName, position);
            
            if (!isValid) {
                feedback.isValid = false;
                feedback.issues.push({
                    finger: fingerName,
                    position: position,
                    issue: position > 1 ? 'over-extension' : position < 0 ? 'invalid-range' : 'anatomically-impossible'
                });
            }
        });
        
        return feedback;
    }
    
    /**
     * Update skeleton for GLTF skinned meshes to ensure mesh follows bone animations
     */
    updateHandSkeleton(hand) {
        if (!hand || !hand.userData.meshes) return;
        
        // Update all skinned meshes in the hand
        hand.userData.meshes.forEach(mesh => {
            if (mesh.isSkinnedMesh && mesh.skeleton) {
                // Update the skeleton to reflect bone changes
                mesh.skeleton.update();
                
                // Ensure the mesh binds to current bone positions
                if (mesh.skeleton.boneMatrices) {
                    mesh.skeleton.computeBoneTexture();
                }
            }
        });
        
        // Also update any direct skinned mesh children
        hand.traverse((child) => {
            if (child.isSkinnedMesh && child.skeleton) {
                child.skeleton.update();
                if (child.skeleton.boneMatrices) {
                    child.skeleton.computeBoneTexture();
                }
            }
        });
    }
    
    /**
     * Linear interpolation helper function
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} factor - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    /**
     * Smooth step function for more natural animations
     * @param {number} edge0 - Lower edge
     * @param {number} edge1 - Upper edge
     * @param {number} x - Input value
     * @returns {number} Smooth step result
     */
    smoothStep(edge0, edge1, x) {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }
    
    /**
     * Update animations - should be called every frame
     */
    update() {
        const hands = ['left', 'right'];
        const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
        let hasAnimations = false;
        
        hands.forEach(handSide => {
            const handObject = handSide === 'left' ? this.leftHand : this.rightHand;
            let handUpdated = false;
            
            fingers.forEach(fingerName => {
                const current = this.currentPositions[handSide][fingerName];
                const target = this.targetPositions[handSide][fingerName];
                
                // Only animate if there's a difference
                if (Math.abs(current - target) > 0.001) {
                    // Smooth animation towards target
                    const newPosition = this.lerp(current, target, this.animationSpeed);
                    this.setFingerToPosition(handSide, fingerName, newPosition);
                    hasAnimations = true;
                    handUpdated = true;
                }
            });
            
            // Update skeleton even without animation to ensure mesh stays bound
            if (handObject) {
                this.updateHandSkeleton(handObject);
            }
        });
        
        return hasAnimations;
    }
    
    /**
     * Set entire hand to represent a number using specific counting logic
     * @param {string} handSide - 'left' or 'right'
     * @param {number} value - Number to represent (0-9 for right, 0-90 for left in tens)
     */
    setHandValue(handSide, value) {
        console.log(`🔢 Setting ${handSide} hand to value ${value}`);
        
        if (handSide === 'right') {
            // Right hand: direct 0-9 values using new pattern system
            this.setRightHandPattern(value);
        } else {
            // Left hand: tens values (0-90), convert to pattern
            const tensPattern = Math.floor(value / 10);
            this.setLeftHandPattern(tensPattern);
        }
    }

    /**
     * Set right hand to show specific number (1-9) using counting logic
     * @param {number} number - Number to display (1-9)
     */
    setRightHandNumber(number) {
        // Clamp between 0 and 9
        number = Math.max(0, Math.min(9, Math.floor(number)));
        
        // Reset all fingers first
        this.setFingerPosition('right', 'thumb', 0);
        this.setFingerPosition('right', 'index', 0);
        this.setFingerPosition('right', 'middle', 0);
        this.setFingerPosition('right', 'ring', 0);
        this.setFingerPosition('right', 'pinky', 0);
        
        // Apply specific counting logic
        switch(number) {
            case 0:
                // All fingers closed (already done above)
                break;
            case 1:
                // Index finger straight, others curled
                this.setFingerPosition('right', 'index', 1);
                break;
            case 2:
                // Index + middle straight, others curled
                this.setFingerPosition('right', 'index', 1);
                this.setFingerPosition('right', 'middle', 1);
                break;
            case 3:
                // Index + middle + ring straight, others curled
                this.setFingerPosition('right', 'index', 1);
                this.setFingerPosition('right', 'middle', 1);
                this.setFingerPosition('right', 'ring', 1);
                break;
            case 4:
                // Index + middle + ring + pinky straight, others curled
                this.setFingerPosition('right', 'index', 1);
                this.setFingerPosition('right', 'middle', 1);
                this.setFingerPosition('right', 'ring', 1);
                this.setFingerPosition('right', 'pinky', 1);
                break;
            case 5:
                // Only thumb straight, others curled
                this.setFingerPosition('right', 'thumb', 1);
                break;
            case 6:
                // Thumb + index straight, others curled
                this.setFingerPosition('right', 'thumb', 1);
                this.setFingerPosition('right', 'index', 1);
                break;
            case 7:
                // Thumb + index + middle straight, others curled
                this.setFingerPosition('right', 'thumb', 1);
                this.setFingerPosition('right', 'index', 1);
                this.setFingerPosition('right', 'middle', 1);
                break;
            case 8:
                // Thumb + index + middle + ring straight, others curled
                this.setFingerPosition('right', 'thumb', 1);
                this.setFingerPosition('right', 'index', 1);
                this.setFingerPosition('right', 'middle', 1);
                this.setFingerPosition('right', 'ring', 1);
                break;
            case 9:
                // All fingers straight
                this.setFingerPosition('right', 'thumb', 1);
                this.setFingerPosition('right', 'index', 1);
                this.setFingerPosition('right', 'middle', 1);
                this.setFingerPosition('right', 'ring', 1);
                this.setFingerPosition('right', 'pinky', 1);
                break;
        }
    }

    /**
     * Set left hand to show multiples of 10 (10-90) using same logic as right hand
     * @param {number} tens - Tens value (10, 20, 30, etc.)
     */
    setLeftHandNumber(tens) {
        // Convert tens to single digit (10->1, 20->2, etc.)
        const digit = Math.floor(tens / 10);
        
        // Clamp between 0 and 9
        const clampedDigit = Math.max(0, Math.min(9, digit));
        
        // Reset all fingers first
        this.setFingerPosition('left', 'thumb', 0);
        this.setFingerPosition('left', 'index', 0);
        this.setFingerPosition('left', 'middle', 0);
        this.setFingerPosition('left', 'ring', 0);
        this.setFingerPosition('left', 'pinky', 0);
        
        // Apply same counting logic as right hand
        switch(clampedDigit) {
            case 0:
                // All fingers closed (already done above)
                break;
            case 1:
                // Index finger straight, others curled
                this.setFingerPosition('left', 'index', 1);
                break;
            case 2:
                // Index + middle straight, others curled
                this.setFingerPosition('left', 'index', 1);
                this.setFingerPosition('left', 'middle', 1);
                break;
            case 3:
                // Index + middle + ring straight, others curled
                this.setFingerPosition('left', 'index', 1);
                this.setFingerPosition('left', 'middle', 1);
                this.setFingerPosition('left', 'ring', 1);
                break;
            case 4:
                // Index + middle + ring + pinky straight, others curled
                this.setFingerPosition('left', 'index', 1);
                this.setFingerPosition('left', 'middle', 1);
                this.setFingerPosition('left', 'ring', 1);
                this.setFingerPosition('left', 'pinky', 1);
                break;
            case 5:
                // Only thumb straight, others curled
                this.setFingerPosition('left', 'thumb', 1);
                break;
            case 6:
                // Thumb + index straight, others curled
                this.setFingerPosition('left', 'thumb', 1);
                this.setFingerPosition('left', 'index', 1);
                break;
            case 7:
                // Thumb + index + middle straight, others curled
                this.setFingerPosition('left', 'thumb', 1);
                this.setFingerPosition('left', 'index', 1);
                this.setFingerPosition('left', 'middle', 1);
                break;
            case 8:
                // Thumb + index + middle + ring straight, others curled
                this.setFingerPosition('left', 'thumb', 1);
                this.setFingerPosition('left', 'index', 1);
                this.setFingerPosition('left', 'middle', 1);
                this.setFingerPosition('left', 'ring', 1);
                break;
            case 9:
                // All fingers straight
                this.setFingerPosition('left', 'thumb', 1);
                this.setFingerPosition('left', 'index', 1);
                this.setFingerPosition('left', 'middle', 1);
                this.setFingerPosition('left', 'ring', 1);
                this.setFingerPosition('left', 'pinky', 1);
                break;
        }
    }
    
    /**
     * Get current hand value based on specific counting logic
     * @param {string} handSide - 'left' or 'right'
     * @returns {number} Current hand value following counting rules
     */
    getHandValue(handSide) {
        const positions = this.currentPositions[handSide];
        const threshold = 0.5; // Consider finger "up" if position > 0.5
        
        const thumbUp = positions.thumb > threshold;
        const indexUp = positions.index > threshold;
        const middleUp = positions.middle > threshold;
        const ringUp = positions.ring > threshold;
        const pinkyUp = positions.pinky > threshold;
        
        // Check specific patterns for counting logic
        if (!thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
            return 0; // All fingers down
        }
        
        // Pattern matching for specific counting logic
        if (thumbUp && indexUp && middleUp && ringUp && pinkyUp) {
            return 9; // All fingers up
        }
        
        if (thumbUp && indexUp && middleUp && ringUp && !pinkyUp) {
            return 8; // Thumb + index + middle + ring
        }
        
        if (thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
            return 7; // Thumb + index + middle
        }
        
        if (thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
            return 6; // Thumb + index
        }
        
        if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
            return 5; // Only thumb
        }
        
        if (!thumbUp && indexUp && middleUp && ringUp && pinkyUp) {
            return 4; // Index + middle + ring + pinky
        }
        
        if (!thumbUp && indexUp && middleUp && ringUp && !pinkyUp) {
            return 3; // Index + middle + ring
        }
        
        if (!thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
            return 2; // Index + middle
        }
        
        if (!thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
            return 1; // Only index
        }
        
        // If no pattern matches exactly, fall back to counting raised fingers
        let count = 0;
        if (thumbUp) count++;
        if (indexUp) count++;
        if (middleUp) count++;
        if (ringUp) count++;
        if (pinkyUp) count++;
        
        return count;
    }
    
    /**
     * Animate hand to show counting sequence
     * @param {string} handSide - 'left' or 'right'
     * @param {number} targetValue - Final value to count to
     * @param {number} duration - Animation duration in milliseconds
     */
    animateCountingSequence(handSide, targetValue, duration = 2000) {
        const startTime = Date.now();
        const startValue = this.getHandValue(handSide);
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use smooth step for more natural progression
            const smoothProgress = this.smoothStep(0, 1, progress);
            const currentValue = Math.floor(this.lerp(startValue, targetValue, smoothProgress));
            
            this.setHandValue(handSide, currentValue);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    /**
     * Create a wave animation for a specific hand
     * @param {string} handSide - 'left' or 'right'
     * @param {number} duration - Wave duration in milliseconds
     */
    animateWave(handSide, duration = 3000) {
        const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
        const startTime = Date.now();
        
        const originalPositions = {};
        fingers.forEach(finger => {
            originalPositions[finger] = this.targetPositions[handSide][finger];
        });
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                // Restore original positions
                fingers.forEach(finger => {
                    this.setFingerPosition(handSide, finger, originalPositions[finger]);
                });
                return;
            }
            
            // Create wave effect
            fingers.forEach((finger, index) => {
                const fingerDelay = index * 0.2;
                const fingerProgress = Math.max(0, Math.min(1, progress * 2 - fingerDelay));
                const waveValue = Math.sin(fingerProgress * Math.PI * 2) * 0.5 + 0.5;
                
                this.setFingerPosition(handSide, finger, waveValue);
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Reset both hands to closed position
     */
    resetHands() {
        const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
        
        ['left', 'right'].forEach(handSide => {
            fingers.forEach(finger => {
                this.setFingerPosition(handSide, finger, 0);
            });
        });
    }
    
    /**
     * Open both hands completely
     */
    openHands() {
        const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
        
        ['left', 'right'].forEach(handSide => {
            fingers.forEach(finger => {
                this.setFingerPosition(handSide, finger, 1);
            });
        });
    }
    
    /**
     * Get the total value represented by both hands
     * @returns {number} Total value (left hand tens + right hand ones)
     */
    getTotalValue() {
        const leftValue = this.getHandValue('left');
        const rightValue = this.getHandValue('right');
        return leftValue * 10 + rightValue;
    }

    /**
     * Set both hands to display a specific total number (0-99)
     * @param {number} total - Total number to display (0-99)
     */
    setTotalValue(total) {
        // Clamp between 0 and 99
        total = Math.max(0, Math.min(99, Math.floor(total)));
        
        const tens = Math.floor(total / 10);
        const ones = total % 10;
        
        this.setLeftHandNumber(tens * 10);
        this.setRightHandNumber(ones);
    }

    /**
     * Validate that current finger positions match counting rules
     * @param {string} handSide - 'left' or 'right'
     * @returns {boolean} True if positions are valid for counting
     */
    validateCountingPosition(handSide) {
        const expectedValue = this.getHandValue(handSide);
        
        // Set hand to expected value and compare positions
        const originalPositions = { ...this.currentPositions[handSide] };
        
        if (handSide === 'right') {
            this.setRightHandNumber(expectedValue);
        } else {
            this.setLeftHandNumber(expectedValue * 10);
        }
        
        // Check if positions match
        const threshold = 0.1;
        let isValid = true;
        
        for (const finger of ['thumb', 'index', 'middle', 'ring', 'pinky']) {
            const expected = this.targetPositions[handSide][finger];
            const original = originalPositions[finger];
            
            if (Math.abs(expected - original) > threshold) {
                isValid = false;
                break;
            }
        }
        
        // Restore original positions
        for (const finger of ['thumb', 'index', 'middle', 'ring', 'pinky']) {
            this.setFingerPosition(handSide, finger, originalPositions[finger]);
        }
        
        return isValid;
    }

    /**
     * Get debug information about current hand states
     * @returns {object} Debug information
     */
    getDebugInfo() {
        return {
            leftHandValue: this.getHandValue('left'),
            rightHandValue: this.getHandValue('right'),
            totalValue: this.getTotalValue(),
            leftHandTens: this.getHandValue('left') * 10,
            currentPositions: { ...this.currentPositions },
            targetPositions: { ...this.targetPositions },
            leftValidPosition: this.validateCountingPosition('left'),
            rightValidPosition: this.validateCountingPosition('right')
        };
    }
    
    /**
     * Set animation speed
     * @param {number} speed - Animation speed (0.01 to 1.0)
     */
    setAnimationSpeed(speed) {
        this.animationSpeed = Math.max(0.01, Math.min(1.0, speed));
    }
    
    /**
     * Check if any animations are currently running
     * @returns {boolean} True if animations are active
     */
    isAnimating() {
        const threshold = 0.001;
        
        for (const hand of ['left', 'right']) {
            for (const finger of ['thumb', 'index', 'middle', 'ring', 'pinky']) {
                const current = this.currentPositions[hand][finger];
                const target = this.targetPositions[hand][finger];
                
                if (Math.abs(current - target) > threshold) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Set right hand to specific number pattern (0-9)
     * @param {number} value - Number to display (0-9)
     */
    setRightHandPattern(value) {
        // Clamp between 0 and 9
        value = Math.max(0, Math.min(9, Math.floor(value)));

        console.log(`👍 RIGHT HAND PATTERN (animated) ${value}:`);

        // Apply mathematical finger patterns by setting targets (animated)
        const patterns = {
            0: { thumb: false, index: false, middle: false, ring: false, pinky: false },
            1: { thumb: false, index: true,  middle: false, ring: false, pinky: false },
            2: { thumb: false, index: true,  middle: true,  ring: false, pinky: false },
            3: { thumb: false, index: true,  middle: true,  ring: true,  pinky: false },
            4: { thumb: false, index: true,  middle: true,  ring: true,  pinky: true  },
            5: { thumb: true,  index: false, middle: false, ring: false, pinky: false },
            6: { thumb: true,  index: true,  middle: false, ring: false, pinky: false },
            7: { thumb: true,  index: true,  middle: true,  ring: false, pinky: false },
            8: { thumb: true,  index: true,  middle: true,  ring: true,  pinky: false },
            9: { thumb: true,  index: true,  middle: true,  ring: true,  pinky: true  }
        };

        const pattern = patterns[value];
        ['thumb','index','middle','ring','pinky'].forEach(name => {
            this.setFingerPosition('right', name, pattern[name] ? 1 : 0);
        });
    }
    
    /**
     * Set left hand to specific tens pattern (0-9 representing 0-90)
     * @param {number} pattern - Pattern number (0-9)
     */
    setLeftHandPattern(pattern) {
        // Clamp between 0 and 9
        pattern = Math.max(0, Math.min(9, Math.floor(pattern)));

        console.log(`👌 LEFT HAND PATTERN (animated) ${pattern} (= ${pattern * 10}):`);

        // Apply mathematical finger patterns by setting targets (animated)
        const patterns = {
            0: { thumb: false, index: false, middle: false, ring: false, pinky: false },
            1: { thumb: false, index: true,  middle: false, ring: false, pinky: false },
            2: { thumb: false, index: true,  middle: true,  ring: false, pinky: false },
            3: { thumb: false, index: true,  middle: true,  ring: true,  pinky: false },
            4: { thumb: false, index: true,  middle: true,  ring: true,  pinky: true  },
            5: { thumb: true,  index: false, middle: false, ring: false, pinky: false },
            6: { thumb: true,  index: true,  middle: false, ring: false, pinky: false },
            7: { thumb: true,  index: true,  middle: true,  ring: false, pinky: false },
            8: { thumb: true,  index: true,  middle: true,  ring: true,  pinky: false },
            9: { thumb: true,  index: true,  middle: true,  ring: true,  pinky: true  }
        };

        const config = patterns[pattern];
        ['thumb','index','middle','ring','pinky'].forEach(name => {
            this.setFingerPosition('left', name, config[name] ? 1 : 0);
        });
    }
    
    /**
     * Apply finger pattern directly for immediate results
     * @param {string} handSide - 'left' or 'right'
     * @param {number} value - Pattern value (0-9)
     */
    applyFingerPatternDirect(handSide, value) {
        if (!this._debugFirstPatternApplied) {
            this._debugFirstPatternApplied = true;
            const hand = handSide === 'left' ? this.leftHand : this.rightHand;
            if (hand?.userData?.fingers) {
                const report = {};
                Object.entries(hand.userData.fingers).forEach(([name, f]) => {
                    const c = f.userData || f;
                    report[name] = !!(c.base?.userData?.restQuaternion && c.middle?.userData?.restQuaternion && c.tip?.userData?.restQuaternion);
                });
                console.log('🧪 Rest quaternions present for fingers:', report);
            }
        }
        // Mathematical finger patterns per AC-HANDMATH-002 and AC-HANDMATH-003
        const patterns = {
            0: { thumb: false, index: false, middle: false, ring: false, pinky: false },
            1: { thumb: false, index: true, middle: false, ring: false, pinky: false },
            2: { thumb: false, index: true, middle: true, ring: false, pinky: false },
            3: { thumb: false, index: true, middle: true, ring: true, pinky: false },
            4: { thumb: false, index: true, middle: true, ring: true, pinky: true },
            5: { thumb: true, index: false, middle: false, ring: false, pinky: false },
            6: { thumb: true, index: true, middle: false, ring: false, pinky: false },
            7: { thumb: true, index: true, middle: true, ring: false, pinky: false },
            8: { thumb: true, index: true, middle: true, ring: true, pinky: false },
            9: { thumb: true, index: true, middle: true, ring: true, pinky: true }
        };
        
        const pattern = patterns[value];
        if (!pattern) {
            console.warn(`Invalid pattern value: ${value}`);
            return;
        }
        
        console.log(`🔥 DIRECT PATTERN APPLICATION: ${handSide} hand pattern ${value}:`, pattern);
        
        // CRITICAL FIX: Apply pattern with TRUE direct positioning (bypass animation system)
        Object.keys(pattern).forEach(fingerName => {
            const shouldExtend = pattern[fingerName];
            // TRUE = extended fingers, FALSE = closed fingers
            const targetPosition = shouldExtend ? 1 : 0; // 1 = extended, 0 = closed
            
            console.log(`🎯 DIRECT: ${handSide} ${fingerName} → ${shouldExtend ? 'EXTENDED (1)' : 'CLOSED (0)'}`);
            
            // BYPASS ALL ANIMATION - Use immediate bone positioning
            this.setFingerToPositionImmediate(handSide, fingerName, targetPosition);
        });
        
        // Force skeleton update for immediate visual changes
        const hand = handSide === 'left' ? this.leftHand : this.rightHand;
        if (hand) {
            this.updateHandSkeleton(hand);
            console.log(`💥 ${handSide} hand skeleton updated immediately`);
        }
    }

    /** Reset all mapped finger bones to their rest (bind/open) quaternions */
    resetPose(handSide) {
        const hand = handSide === 'left' ? this.leftHand : this.rightHand;
        if (!hand?.userData?.fingers) return;
        Object.values(hand.userData.fingers).forEach(f => {
            const c = f.userData || f;
            ['base','middle','tip'].forEach(k => {
                const b = c[k];
                if (b?.userData?.restQuaternion) {
                    b.quaternion.copy(b.userData.restQuaternion);
                }
            });
        });
        this.updateHandSkeleton(hand);
        this._log('info',`🔄 Reset ${handSide} pose to rest quaternions`);
    }
    
    /**
     * Immediate finger positioning - completely bypass animation system
     * @param {string} handSide - 'left' or 'right'
     * @param {string} fingerName - finger name
     * @param {number} position - 0 (closed) to 1 (open/extended)
     */
    setFingerToPositionImmediate(handSide, fingerName, position) {
        const hand = handSide === 'left' ? this.leftHand : this.rightHand;
        if (!hand) {
            console.warn(`❌ Hand not found: ${handSide}`);
            return;
        }
        
        const finger = hand.userData.fingers && hand.userData.fingers[fingerName];
        if (!finger) {
            console.warn(`❌ Finger not found: ${handSide} ${fingerName}`);
            return;
        }

        this._log('debug',`⚡ IMMEDIATE: ${handSide} ${fingerName} → ${position === 1 ? 'EXTENDED' : 'CLOSED'} (${position})`);

        const isThumb = fingerName === 'thumb';
        // Determine splay in degrees scaled by openness
        const splayDeg = (this.splayDegrees?.[handSide]?.[fingerName] || 0) * (position || 0);

        // Prefer quaternion path if rest quaternions are available for any joint
        const hasRest = !!(finger.userData.base?.userData?.restQuaternion ||
                           finger.userData.middle?.userData?.restQuaternion ||
                           finger.userData.tip?.userData?.restQuaternion);
        if (hasRest) {
            this._log('debug',`🟣 QPATH (immediate): ${handSide} ${fingerName} pos=${position}`);
            this.applyQuaternionCurl(finger, fingerName, position, isThumb, splayDeg);
        } else {
            // Fallback to Euler immediate (legacy)
            this._log('debug',`🟠 EULER (immediate fallback): ${handSide} ${fingerName} pos=${position}`);
            const angles = this.getAnatomicalAngles(fingerName, position);
            let splayY = 0; // radians
            if (position >= 0.99) {
                const deg = (d) => d * Math.PI / 180;
                const table = this.splayDegrees[handSide];
                if (table) {
                    if (fingerName === 'thumb') splayY = deg(table.thumb || 0);
                    if (fingerName === 'index') splayY = deg(table.index || 0);
                    if (fingerName === 'middle') splayY = deg(table.middle || 0);
                    if (fingerName === 'ring')  splayY = deg(table.ring || 0);
                    if (fingerName === 'pinky') splayY = deg(table.pinky || 0);
                }
            }
            if (finger.userData.base) {
                if (isThumb) {
                    finger.userData.base.rotation.x = angles.base * 0.6;
                    if (finger.userData.root) {
                        finger.userData.root.rotation.y = splayY;
                        finger.userData.base.rotation.y = angles.base * 0.7;
                    } else {
                        finger.userData.base.rotation.y = angles.base * 0.7 + splayY;
                    }
                    finger.userData.base.rotation.z = angles.base * 0.4;
                } else {
                    finger.userData.base.rotation.x = 0;
                    if (finger.userData.root) {
                        finger.userData.root.rotation.y = splayY;
                        finger.userData.base.rotation.y = 0;
                    } else {
                        finger.userData.base.rotation.y = splayY;
                    }
                    finger.userData.base.rotation.z = position >= 0.99 ? 0 : angles.base;
                }
            }
            if (finger.userData.middle && finger.userData.middle !== finger.userData.base) {
                if (isThumb) {
                    finger.userData.middle.rotation.x = angles.middle * 0.85;
                    finger.userData.middle.rotation.y = angles.middle * 0.2;
                    finger.userData.middle.rotation.z = angles.middle * 0.45;
                } else {
                    finger.userData.middle.rotation.x = 0;
                    finger.userData.middle.rotation.y = 0;
                    finger.userData.middle.rotation.z = position >= 0.99 ? 0 : angles.middle;
                }
            }
            if (finger.userData.tip && finger.userData.tip !== finger.userData.base) {
                if (isThumb) {
                    finger.userData.tip.rotation.x = angles.tip * 0.9;
                    finger.userData.tip.rotation.y = angles.tip * 0.15;
                    finger.userData.tip.rotation.z = angles.tip * 0.35;
                } else {
                    finger.userData.tip.rotation.x = 0;
                    finger.userData.tip.rotation.y = 0;
                    finger.userData.tip.rotation.z = position >= 0.99 ? 0 : angles.tip;
                }
            }
        }

        // CRITICAL: Update position tracking
        this.currentPositions[handSide][fingerName] = position;
        this.targetPositions[handSide][fingerName] = position;
        
        this._log('debug',`✅ IMMEDIATE: ${handSide} ${fingerName} positioned instantly`);
    }

    /**
     * Bulk set splay degrees for multiple fingers and reapply both hands
     */
    setBulkSplay(preset) {
        if (!preset) return;
        ['left','right'].forEach(handSide => {
            const handPreset = preset[handSide];
            if (!handPreset) return;
            Object.keys(handPreset).forEach(finger => {
                if (this.splayDegrees[handSide] && finger in this.splayDegrees[handSide]) {
                    const val = Math.max(-25, Math.min(25, Number(handPreset[finger]) || 0));
                    this.splayDegrees[handSide][finger] = val;
                }
            });
            this.reapplyImmediatePose(handSide);
        });
    }

    /** Capture current quaternions as the closed pose for a specific finger */
    captureClosedPose(handSide, fingerName) {
        const hand = handSide === 'left' ? this.leftHand : this.rightHand;
        const finger = hand?.userData?.fingers?.[fingerName];
        if (!finger) return false;
        const c = finger.userData || finger;
        const snap = (b) => b ? b.quaternion.clone() : null;
        c.closedQ = {
            base: snap(c.base),
            middle: snap(c.middle),
            tip: snap(c.tip)
        };
        return true;
    }

    /** Capture closed pose for all five fingers on a hand */
    captureClosedPoseForHand(handSide) {
        ['thumb','index','middle','ring','pinky'].forEach(name => this.captureClosedPose(handSide, name));
    }
}

// Logging helpers for HandController
HandController.prototype._levelNum = function(level){const m={silent:0,error:1,warn:2,info:3,debug:4};return m[level]??2;};
HandController.prototype._logEnabled = function(level){return this._levelNum(level) <= this._logLevelNum;};
HandController.prototype._log = function(level, ...args){if(!this._logEnabled(level))return; if(level==='error')console.error(...args); else if(level==='warn')console.warn(...args); else console.log(...args);};
