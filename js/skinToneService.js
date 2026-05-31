class SkinToneService {
    constructor(app) {
        this.app = app;
        this.materials = new Set();
        this.defaultHex = null;
        this.currentHex = null;
        this._pendingHex = null;
        this._rafId = 0;
        this._batchColor = new THREE.Color();
    }

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

    captureDefaultColor() {
        this.defaultHex = '#e8b4a0';
        this.currentHex = this.defaultHex;
    }

    init() {
        this.cacheMaterials();
        this.captureDefaultColor();
    }

    static isValidHex(hex) {
        if (typeof hex !== 'string') return false;
        const h = hex.trim();
        return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h);
    }

    setColor(hex) {
        if (!SkinToneService.isValidHex(hex)) {
            return false;
        }
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
            if (mat.map && mat.map.image) {
                this._applyTextureTint(mat, this._batchColor);
            } else if (mat.color && typeof mat.color.set === 'function') {
                mat.color.set(this._batchColor);
                mat.needsUpdate = true;
            }
        }
        this.currentHex = hex;
    }

    _applyTextureTint(mat, tintColor) {
        if (!mat.userData) mat.userData = {};
        if (!mat.userData._skinToneOriginalMap) {
            mat.userData._skinToneOriginalMap = mat.map;
            mat.userData._skinToneOriginalColor = mat.color.clone();
        } else if (mat.userData._skinToneTinted && mat.map !== mat.userData._skinToneOriginalMap) {
            mat.map.dispose();
        }
        const origMap = mat.userData._skinToneOriginalMap;
        const img = origMap.image;
        let w = img.width, h = img.height;
        if ((!w || !h) && typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) {
            w = img.naturalWidth; h = img.naturalHeight;
        }
        if (!w || !h) {
            mat.color.set(tintColor);
            mat.needsUpdate = true;
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const tr = tintColor.r, tg = tintColor.g, tb = tintColor.b;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
            data[i] = Math.min(255, Math.max(0, ((r * 0.15 + tr * 0.85)) * 255));
            data[i + 1] = Math.min(255, Math.max(0, ((g * 0.15 + tg * 0.85)) * 255));
            data[i + 2] = Math.min(255, Math.max(0, ((b * 0.15 + tb * 0.85)) * 255));
        }
        ctx.putImageData(imageData, 0, 0);
        const tintedTex = new THREE.CanvasTexture(canvas);
        tintedTex.encoding = origMap.encoding !== undefined ? origMap.encoding : THREE.sRGBEncoding;
        tintedTex.wrapS = origMap.wrapS;
        tintedTex.wrapT = origMap.wrapT;
        tintedTex.repeat.copy(origMap.repeat);
        tintedTex.offset.copy(origMap.offset);
        tintedTex.anisotropy = origMap.anisotropy;
        tintedTex.flipY = origMap.flipY;
        mat.map = tintedTex;
        mat.color.set('#ffffff');
        mat.userData._skinToneTinted = true;
        mat.needsUpdate = true;
    }

    flush() { this._applyPending(); }

    static _normalizeHex(hex) {
        let h = hex.trim().toLowerCase();
        if (h.length === 4) {
            const r = h[1], g = h[2], b = h[3];
            h = `#${r}${r}${g}${g}${b}${b}`;
        }
        return h;
    }

    _isSkinCandidate(mesh, material) {
        const n = (mesh?.name || '').toLowerCase();
        const mn = (material?.name || '').toLowerCase();
        if (material?.userData?.isSkin === true) return true;
        if (material?.userData?.excludeFromSkin === true) return false;
        const bad = ['nail', 'ring', 'bracelet', 'cloth', 'sleeve'];
        if (bad.some(w => n.includes(w) || mn.includes(w))) return false;
        const good = ['skin', 'hand', 'palm', 'finger'];
        if (good.some(w => n.includes(w) || mn.includes(w))) return true;
        const likelyAccessory = (material?.metalness ?? 0) > 0.2 || (material?.transparent === true);
        if (likelyAccessory) return false;
        return !!material?.color;
    }

    restoreOriginalMapsIfDefault() {
        if (!this.defaultHex || this.currentHex !== this.defaultHex) return;
        for (const mat of this.materials) {
            if (!mat) continue;
            const origMap = mat.userData?._skinToneOriginalMap;
            if (origMap) {
                if (mat.map && mat.map !== origMap && mat.userData._skinToneTinted) {
                    mat.map.dispose();
                }
                mat.map = origMap;
                delete mat.userData._skinToneOriginalMap;
                delete mat.userData._skinToneTinted;
            }
            if (mat.userData._skinToneOriginalColor) {
                mat.color.copy(mat.userData._skinToneOriginalColor);
                delete mat.userData._skinToneOriginalColor;
            } else if (mat.color && typeof mat.color.set === 'function') {
                mat.color.set('#ffffff');
            }
            mat.needsUpdate = true;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkinToneService;
} else {
    window.SkinToneService = SkinToneService;
}


