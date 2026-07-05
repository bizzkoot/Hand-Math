// Minimal debug API for driving hand articulation from console/UI
// Exposes window.handDebug with helpers

(function(){
    function ensureController() {
        const app = window.handMathApp;
        if (!app || !app.handController) {
            console.warn('handDebug: app or handController not found');
            return null;
        }
        return app.handController;
    }

    const dbg = {
        setCurl(hand, finger, v) {
            const ctl = ensureController(); if (!ctl) return;
            const clamped = Math.max(0, Math.min(1, Number(v)));
            ctl.setFingerToPositionAnatomical(hand, finger, clamped);
        },
        setSplay(hand, finger, deg) {
            const ctl = ensureController(); if (!ctl) return;
            ctl.setSplayDegrees(hand, finger, Number(deg)||0);
        },
        open(hand) {
            const ctl = ensureController(); if (!ctl) return;
            ['thumb','index','middle','ring','pinky'].forEach(f=>ctl.setFingerToPositionAnatomical(hand,f,1));
        },
        fist(hand) {
            const ctl = ensureController(); if (!ctl) return;
            ['thumb','index','middle','ring','pinky'].forEach(f=>ctl.setFingerToPositionAnatomical(hand,f,0));
        },
        pose(left, right) {
            const ctl = ensureController(); if (!ctl) return;
            const fs=['thumb','index','middle','ring','pinky'];
            if (left)  fs.forEach((f,i)=> ctl.setFingerToPositionAnatomical('left', f,  left[f]  ?? 0));
            if (right) fs.forEach((f,i)=> ctl.setFingerToPositionAnatomical('right', f, right[f] ?? 0));
        },
        resetPose(hand) {
            const ctl = ensureController(); if (!ctl) return;
            ctl.resetPose(hand);
        },
        dumpRestPresence(hand) {
            const ctl = ensureController(); if (!ctl) return;
            const side = hand;
            const obj = side==='left'? ctl.leftHand : ctl.rightHand;
            const out = {};
            if (obj?.userData?.fingers) {
                Object.entries(obj.userData.fingers).forEach(([name, f]) => {
                    const c=f.userData||f;
                    out[name]={
                        base: !!c.base?.userData?.restQuaternion,
                        middle: !!c.middle?.userData?.restQuaternion,
                        tip: !!c.tip?.userData?.restQuaternion
                    };
                });
            }
            console.log('restQuaternion presence:', out);
            return out;
        },
        info() {
            const app = window.handMathApp;
            if (!app || !app.handController) return console.warn('No controller');
            const hc = app.handController;
            return {
                left:  hc.leftHand?.userData?.fingers && Object.keys(hc.leftHand.userData.fingers),
                right: hc.rightHand?.userData?.fingers && Object.keys(hc.rightHand.userData.fingers),
                splay: hc.splayDegrees
            };
        }
    };

    window.handDebug = dbg;
    console.log('✅ handDebug API ready: handDebug.setCurl("right","index", 0.7)');
})();
