// ==========================================
// 自由体操 E分(执行分) 计算引擎 (e_score.js)
// 纯净统计学版本
// ==========================================

const ExecutionEngine = {
    
    // 模拟单个裁判打分：基准分 ± 0.3，保留 1 位小数
    generateJudgeScore: function(baseScore) {
        let fluctuation = (Math.random() * 0.6) - 0.3; 
        let finalScore = baseScore + fluctuation;
        if (finalScore > 10.0) finalScore = 10.0;
        return parseFloat(finalScore.toFixed(1)); 
    },

    // 核心 E 分计算公式
    calculateEScore: function(gymnastId, tracks) {
        const gymnast = gymnastsData.find(g => g.id === gymnastId);
        if (!gymnast) return null;

        // 【新增算法】艺术分(AD) 30% 概率波动 (±0.1)
        let finalAD = gymnast.adMean;
        let adRand = Math.random();
        if (adRand < 0.15) {
            finalAD += 0.1; // 15% 概率艺术分扣得更严
        } else if (adRand < 0.30) {
            finalAD -= 0.1; // 15% 概率艺术分扣得更松
        }
        // 规避 JS 浮点数相加出现 0.300000004 的 bug
        finalAD = Math.round(finalAD * 10) / 10;
        if (finalAD < 0) finalAD = 0;

        let report = {
            gymnastNameEn: gymnast.nameEn,
            country: gymnast.country,
            judges: [],           
            averageScore: 0,      
            artisticDeduction: finalAD, // 传入波动后的最终艺术分
            fallCount: 0,         
            fallDeduction: 0,     
            fallTrackIds: [],     
            finalEScore: 0        
        };

        for (let i = 0; i < 3; i++) {
            report.judges.push(this.generateJudgeScore(gymnast.edBase));
        }

        let sum = report.judges.reduce((a, b) => a + b, 0);
        report.averageScore = parseFloat((sum / 3).toFixed(3));

        tracks.forEach(track => {
            if (track.type === 'line' && track.skills && track.skills.length > 0) {
                if (Math.random() < 0.05) {
                    report.fallCount++;
                    report.fallDeduction += 1.0; 
                    report.fallTrackIds.push(track.id); 
                }
            }
        });

        // 最终公式扣除的也是波动后的艺术分
        report.finalEScore = report.averageScore - report.artisticDeduction - report.fallDeduction;
        
        if (report.finalEScore < 0) report.finalEScore = 0;
        report.finalEScore = parseFloat(report.finalEScore.toFixed(3));

        return report;
    }
};