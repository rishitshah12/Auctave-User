import { CrmTask } from './types';

export function calculateOrderRiskScore(tasks: CrmTask[]): 'green' | 'amber' | 'red' {
    if (!tasks || tasks.length === 0) return 'green';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let worstScore: 'green' | 'amber' | 'red' = 'green';
    let amberCount = 0;

    for (const task of tasks) {
        if (task.status === 'COMPLETE') continue;
        if (!task.plannedEndDate) continue;

        const dueDate = new Date(task.plannedEndDate);
        dueDate.setHours(0, 0, 0, 0);

        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue <= 0) continue;

        // Higher-priority tasks have tighter buffers
        const isCritical = task.priority === 'Urgent' || task.priority === 'High';
        // Urgent/High: amber at 2 days, red at 8 days
        // Medium/Low/unset: amber at 4 days, red at 12 days
        const amberThreshold = isCritical ? 2 : 4;
        const redThreshold = isCritical ? 8 : 12;

        if (daysOverdue >= redThreshold) return 'red';
        if (daysOverdue >= amberThreshold) {
            amberCount++;
            worstScore = 'amber';
        }
    }

    // 3+ tasks in amber signals a systemic delay — escalate to red
    if (amberCount >= 3) return 'red';

    return worstScore;
}

export function trustTierFromCount(count: number): 'unverified' | 'bronze' | 'silver' | 'gold' {
    if (count >= 10) return 'gold';
    if (count >= 4) return 'silver';
    if (count >= 1) return 'bronze';
    return 'unverified';
}

export async function updateOrderRiskScore(
    orderId: string,
    tasks: CrmTask[],
    currentScore: string | undefined,
    supabase: any
): Promise<'green' | 'amber' | 'red'> {
    const newScore = calculateOrderRiskScore(tasks);
    if (newScore !== currentScore) {
        await supabase
            .from('crm_orders')
            .update({ risk_score: newScore, risk_score_updated_at: new Date().toISOString() })
            .eq('id', orderId);
    }
    return newScore;
}

export async function updateFactoryMetricsOnCompletion(
    factoryId: string,
    tasks: CrmTask[],
    currentCompletedCount: number,
    supabase: any
): Promise<void> {
    if (!factoryId) return;

    const newCount = currentCompletedCount + 1;
    const newTier = trustTierFromCount(newCount);

    // Check if final task was completed on time
    const lastTask = tasks[tasks.length - 1];
    let onTimeDelta = 0;
    if (lastTask?.plannedEndDate && lastTask.actualEndDate) {
        const planned = new Date(lastTask.plannedEndDate);
        const actual = new Date(lastTask.actualEndDate);
        onTimeDelta = actual <= planned ? 1 : 0;
    }

    // Fetch current factory metrics to compute rolling average
    const { data: factory } = await supabase
        .from('factories')
        .select('on_time_delivery_rate, completed_orders_count')
        .eq('id', factoryId)
        .single();

    let newOnTimeRate: number | undefined;
    if (factory) {
        const prevRate = factory.on_time_delivery_rate ?? 100;
        const prevCount = factory.completed_orders_count ?? 0;
        if (prevCount === 0) {
            newOnTimeRate = onTimeDelta * 100;
        } else {
            newOnTimeRate = Math.round(((prevRate * prevCount + onTimeDelta * 100) / (prevCount + 1)) * 10) / 10;
        }
    }

    const updates: any = {
        completed_orders_count: newCount,
        trust_tier: newTier,
    };
    if (newOnTimeRate !== undefined) {
        updates.on_time_delivery_rate = newOnTimeRate;
    }

    await supabase.from('factories').update(updates).eq('id', factoryId);
}
