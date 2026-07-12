// Deterministic hooks for Playwright
(function(){
    function ready(){ return window.__HM__ && window.handMathApp; }
    function ensure(cb){ if(!ready()) return setTimeout(()=>ensure(cb),50); cb(); }
    ensure(()=>{
        const { orchestrator, adapter, ui } = window.__HM__;
        window.TEST_API = {
            setAutoPlay(ms){ orchestrator.engine.setAuto(true, ms ?? 900); },
            clearAuto(){ orchestrator.engine.setAuto(false); },
            nextStep(){ return orchestrator.next(); },
            prevStep(){ return orchestrator.prev(); },
            reset(){ orchestrator.reset(); },
            setProblem({a,b,op}){ orchestrator.setProblem(a,b,op ?? orchestrator.problem.op); },
            setMultiStepProblem(operands, operators){ orchestrator.setMultiStepProblem(operands, operators); },
            getState(){ return orchestrator.state(); },
            waitForSettled(ms){ return adapter.awaitSettled({ timeoutMs: ms ?? 2000 }); },
            // Operand range level (1..5). Set or read.
            setOperandLevel(n){ if (ui) ui.setOperandLevel(n); return ui ? ui.operandLevel : null; },
            getOperandLevel(){ return ui ? ui.operandLevel : null; },
            getOperandLevelMax(n){ return ui ? ui.getOperandLevelMax(n) : null; },
            // Stress test skin tone changes; ensure animation continues smoothly
            skinToneStress(opts){
                const app = window.handMathApp;
                if (!app?.skinToneService) return Promise.resolve(false);
                const colors = (opts?.colors) || ['#f3d7c6','#e0b899','#c79a6b','#a47250','#7a4f35','#4d3325'];
                const count = opts?.count ?? 60;
                const delay = opts?.delayMs ?? 50;
                return new Promise((resolve)=>{
                    let i = 0;
                    const tick = () => {
                        if (i >= count) return resolve(true);
                        const h = colors[i % colors.length];
                        app.setSkinColor(h);
                        i++;
                        setTimeout(tick, delay);
                    };
                    tick();
                });
            }
        };
    });
})();
