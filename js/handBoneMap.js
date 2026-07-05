// Builds a bone map { thumb|index|middle|ring|pinky: { base, middle, tip } } for a GLTF hand
// Exposed as window.buildBoneMapForHand(root)

(function(){
    function findByName(root, name) {
        let found = null;
        root.traverse((o) => {
            if (!found && o.name === name) found = o;
        });
        return found;
    }

    function buildBoneMapForHand(root) {
        if (!root || typeof root.traverse !== 'function') {
            console.warn('buildBoneMapForHand: invalid root');
            return null;
        }

        const names = {
            thumb:  ['thumb_01.R_08',  'thumb_02.R_09',  'thumb_03.R_010'],
            index:  ['index_01.R_017', 'index_02.R_018', 'index_03.R_019'],
            middle: ['middle_01.R_025','middle_02.R_026','middle_03.R_027'],
            ring:   ['ring_01.R_033',  'ring_02.R_034',  'ring_03.R_035'],
            pinky:  ['pinky_01.R_041', 'pinky_02.R_042', 'pinky_03.R_043']
        };

        const result = {};
        let missing = [];

        Object.entries(names).forEach(([finger, arr]) => {
            const [b, m, t] = arr.map(n => findByName(root, n));
            result[finger] = { base: b || null, middle: m || null, tip: t || null };
            if (!b || !m || !t) {
                missing.push({ finger, have: { b: !!b, m: !!m, t: !!t } });
            }
        });

        // Attach to userData if looks valid (at least some found)
        const foundCount = Object.values(result).reduce((acc, f) => acc + [f.base, f.middle, f.tip].filter(Boolean).length, 0);
        if (foundCount === 0) {
            console.warn('buildBoneMapForHand: no expected bones found. Check model names.');
        }

        root.userData = root.userData || {};
        root.userData.fingers = result;

        if (missing.length) {
            console.warn('Bone map incomplete:', missing);
        } else {
            console.log('✅ Bone map built for hand:', Object.keys(result));
        }
        return result;
    }

    window.buildBoneMapForHand = buildBoneMapForHand;
})();

