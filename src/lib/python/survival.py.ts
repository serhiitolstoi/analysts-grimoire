/**
 * Kaplan-Meier survival estimator — pure numpy implementation.
 * (lifelines not available in Pyodide, so we implement KM manually)
 *
 * Input (via input_json):
 *   { durations: number[], observed: number[], group?: string[] }
 *
 * Output: JSON string with KM curves per group.
 */
export const SURVIVAL_PYTHON = `
import json
import numpy as np

data = json.loads(input_json)
durations = np.array(data['durations'], dtype=float)
observed  = np.array(data['observed'],  dtype=int)
groups    = data.get('groups', ['all'] * len(durations))
groups    = np.array(groups)

def kaplan_meier(t, e):
    """
    Compute KM estimator.
    t: array of durations
    e: array of event indicators (1=event, 0=censored)
    Returns: (times, survival, ci_lower, ci_upper)
    """
    order = np.argsort(t)
    t = t[order]; e = e[order]
    unique_times = np.unique(t[e == 1])
    n = len(t)
    S = 1.0
    log_var = 0.0
    timeline = [0]
    surv     = [1.0]
    lower    = [1.0]
    upper    = [1.0]

    for ti in unique_times:
        at_risk = np.sum(t >= ti)
        events  = np.sum((t == ti) & (e == 1))
        if at_risk == 0:
            continue
        S *= (1.0 - events / at_risk)
        # Greenwood's formula for variance
        if at_risk > events:
            log_var += events / (at_risk * (at_risk - events))
        timeline.append(float(ti))
        surv.append(float(S))
        # 95% CI via log(-log) transform (Hall-Wellner)
        if S > 0 and S < 1:
            se = S * np.sqrt(log_var)
            ci_lo = max(0.0, float(S - 1.96 * se))
            ci_hi = min(1.0, float(S + 1.96 * se))
        else:
            ci_lo = float(S); ci_hi = float(S)
        lower.append(ci_lo)
        upper.append(ci_hi)

    return timeline, surv, lower, upper

results = []
for g in np.unique(groups):
    mask = groups == g
    tg = durations[mask]
    eg = observed[mask]
    times, surv, lower, upper = kaplan_meier(tg, eg)
    results.append({
        'group': str(g),
        'n': int(np.sum(mask)),
        'events': int(np.sum(eg)),
        'times': times,
        'survival': surv,
        'ci_lower': lower,
        'ci_upper': upper,
    })

json.dumps(results)
`;
