class SkinToneService {
    constructor(app) {
        this.app = app;
        this.materials = new Set();
        this.defaultHex = null;
        this.currentHex = null;
        this._pendingHex = null;
        this._rafId = 0;
        this._batchColor = new THREE.Color();
        // Preserve textures by default: apply tint via shader hook instead of removing maps
        this._overrideAlbedo = false;
        this._useShaderTint = true;
        this._tintStrength = 1.0; // 0..1
    }

    // Collect unique THREE.Material instances from both hands
    cacheMaterials() {
        const collect = (strict) => {
            const set = new Set();
            const addFrom = (root) => {
                if (!root) return;
                root.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const addMaybe = (m) => {
                            if (!m) return;
                            if (strict ? this._isSkinCandidate(child, m) : (!!m.color)) set.add(m);
                        };
                        if (Array.isArray(child.material)) child.material.forEach(addMaybe);
                        else addMaybe(child.material);
                    }
                });
            };
            addFrom(this.app.leftHand);
            addFrom(this.app.rightHand);
            return set;
        };
        // Try strict skin-only first; if none found, fallback to any color-bearing material
        let strictSet = collect(true);
        if (strictSet.size === 0) {
            const looseSet = collect(false);
            this.materials = looseSet;
            if (this._logOnceLoose !== true) {
                try { console.warn('[SkinToneService] No skin materials matched heuristics; falling back to all color materials:', looseSet.size); } catch(_){}
                this._logOnceLoose = true;
            }
        } else {
            this.materials = strictSet;
        }
    }

    // Capture default color from first material that has a color
    captureDefaultColor() {
        for (const mat of this.materials) {
            if (mat && mat.color) {
                const c = mat.color.clone();
                this.defaultHex = '#' + c.getHexString();
                if (!this.currentHex) this.currentHex = this.defaultHex;
                break;
            }
        }
    }

    // Public: initialize cache and baseline
    init() {
        this.cacheMaterials();
        this.captureDefaultColor();
    }

    // Validate hex color strings: #RGB, #RRGGBB (case-insensitive)
    static isValidHex(hex) {
        if (typeof hex !== 'string') return false;
        const h = hex.trim();
        return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h);
    }

    // Set skin color request; micro-batched via rAF to avoid stutter/leaks
    setColor(hex) {
        if (!SkinToneService.isValidHex(hex)) {
            return false;
        }
        // Normalize to 6-digit lowercase to coalesce requests
        const norm = SkinToneService._normalizeHex(hex);
        this._pendingHex = norm;
        if (!this.materials || this.materials.size === 0) {
            this.cacheMaterials();
        }
        if (!this._rafId) {
            this._rafId = (typeof window !== 'undefined' && window.requestAnimationFrame)
                ? window.requestAnimationFrame(() => this._applyPending())
                : setTimeout(() => this._applyPending(), 16);
        }
        return true;
    }

    _applyPending() {
        this._rafId = 0;
        const hex = this._pendingHex;
        if (!hex || hex === this.currentHex) return;
        this._batchColor.set(hex);
        for (const mat of this.materials) {
            if (!mat) continue;
            if (this._useShaderTint) {
                this._ensureTintHook(mat);
                const u = mat.userData && mat.userData._skinTintUniform;
                const us = mat.userData && mat.userData._skinTintStrengthUniform;
                if (u) u.value.copy(this._batchColor);
                if (us) us.value = this._tintStrength;
                mat.needsUpdate = true;
            } else {
                // Fallback: direct color set (may multiply with texture)
                if (mat.color && typeof mat.color.set === 'function') {
                    mat.color.set(this._batchColor);
                    mat.needsUpdate = true;
                }
            }
        }
        this.currentHex = hex;
    }

    // Immediate apply (used by tests/debug)
    flush() { this._applyPending(); }

    static _normalizeHex(hex) {
        let h = hex.trim().toLowerCase();
        if (h.length === 4) { // #rgb -> #rrggbb
            const r = h[1], g = h[2], b = h[3];
            h = `#${r}${r}${g}${g}${b}${b}`;
        }
        return h;
    }

    // Heuristic: include only likely skin materials, exclude nails/others.
    _isSkinCandidate(mesh, material) {
        const n = (mesh?.name || '').toLowerCase();
        const mn = (material?.name || '').toLowerCase();
        // Explicit opt-in via userData
        if (material?.userData?.isSkin === true) return true;
        // Explicit opt-out via userData
        if (material?.userData?.excludeFromSkin === true) return false;
        const bad = ['nail', 'ring', 'bracelet', 'cloth', 'sleeve'];
        if (bad.some(w => n.includes(w) || mn.includes(w))) return false;
        const good = ['skin', 'hand', 'palm', 'finger'];
        if (good.some(w => n.includes(w) || mn.includes(w))) return true;
        // Likely accessory if metallic or transparent
        const likelyAccessory = (material?.metalness ?? 0) > 0.2 || (material?.transparent === true);
        if (likelyAccessory) return false;
        // Default to include if it has a color and not emissive-only
        return !!material?.color;
    }

    // Restore original albedo maps when resetting to default color
    restoreOriginalMapsIfDefault() {
        if (!this.defaultHex || this.currentHex !== this.defaultHex) return;
        // When using shader tint, reset tint to white so texture shows naturally
        if (this._useShaderTint) {
            for (const mat of this.materials) {
                const u = mat?.userData?._skinTintUniform;
                const us = mat?.userData?._skinTintStrengthUniform;
                if (u) { u.value.set('#ffffff'); }
                if (us) { us.value = 0.0; }
                if (u || us) mat.needsUpdate = true;
            }
        } else if (this._overrideAlbedo) {
            for (const mat of this.materials) {
                if (!mat) continue;
                const orig = mat.userData && mat.userData._skinToneOriginalMap;
                if (orig) {
                    mat.map = orig;
                    delete mat.userData._skinToneOriginalMap;
                    mat.needsUpdate = true;
                }
            }
        }
    }

    _ensureTintHook(mat) {
        if (!mat || mat.userData?._skinTintPatched) return;
        if (!mat.userData) mat.userData = {};
        // Uniform shared per material instance
        const uniform = { value: new THREE.Color(this.currentHex || this.defaultHex || '#ffffff') };
        const strength = { value: this._tintStrength };
        mat.userData._skinTintUniform = uniform;
        mat.userData._skinTintStrengthUniform = strength;
        const prev = mat.onBeforeCompile;
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.tintColor = uniform;
            shader.uniforms.tintStrength = strength;
            // Prepend uniforms and helpers (HSV colorize preserving value/luminance)
            const header = `
uniform vec3 tintColor;
uniform float tintStrength;

vec3 rgb2hsv(vec3 c){
  vec4 K = vec4(0., -1./3., 2./3., -1.);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs((q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1., 2./3., 1./3., 3.);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6. - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0., 1.), c.y);
}

vec3 applySkinTint(vec3 albedo, vec3 tint, float strength){
  // Convert to HSV, replace H and S from tint, keep V from base to preserve luminance
  vec3 ahsv = rgb2hsv(albedo);
  vec3 thsv = rgb2hsv(tint);
  vec3 newhsv = vec3(thsv.x, mix(ahsv.y, thsv.y, strength), ahsv.z);
  vec3 newrgb = hsv2rgb(newhsv);
  // Blend between original and colorized by strength
  return mix(albedo, newrgb, strength);
}
`;
            shader.fragmentShader = header + shader.fragmentShader;

            // 1) Preferred: scale outgoingLight by ratio of colorized albedo to original albedo
            // Find point after outgoingLight is computed and before final gl_FragColor assignment
            const assign = 'gl_FragColor = vec4( outgoingLight, diffuseColor.a );';
            if (shader.fragmentShader.includes(assign)) {
                shader.fragmentShader = shader.fragmentShader.replace(
                    assign,
                    `{
                        vec3 baseAlbedo = diffuseColor.rgb;
                        vec3 colorized = applySkinTint(baseAlbedo, tintColor, tintStrength);
                        vec3 ratio = colorized / max(baseAlbedo, vec3(1.0e-3));
                        gl_FragColor = vec4( outgoingLight * ratio, diffuseColor.a );
                    }`
                );
            } else {
                // 2) Fallback: colorize diffuse directly
                shader.fragmentShader = shader.fragmentShader.replace(
                    'vec4 diffuseColor = vec4( diffuse, opacity );',
                    'vec4 diffuseColor = vec4( applySkinTint(diffuse, tintColor, tintStrength), opacity );'
                );
            }
            if (typeof prev === 'function') prev(shader);
        };
        mat.userData._skinTintPatched = true;
        mat.needsUpdate = true;
    }

    // Optional: expose strength so UI/tests can adjust blending
    setTintStrength(strength) {
        const s = Math.max(0, Math.min(1, Number(strength)));
        this._tintStrength = s;
        // Push immediately if materials already patched
        for (const mat of this.materials) {
            const us = mat?.userData?._skinTintStrengthUniform;
            if (us) { us.value = s; mat.needsUpdate = true; }
        }
    }
}

// UMD-style exposure (consistent with project style)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkinToneService;
} else {
    window.SkinToneService = SkinToneService;
}
