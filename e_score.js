// ==========================================
// 自由体操 E分(执行分) 计算引擎 (e_score.js)
// 包含物理场地特性与 4大核心 Tags 标签系统
// ==========================================

const ExecutionEngine = {
    
    // 模拟单个裁判打分：引入标签影响
    generateJudgeScore: function(baseScore, tags = []) {
        let fluctuation = 0;

        if (tags.includes('erratic')) {
            // 神经刀：40%概率崩盘扣大分，60%概率极大波动 (-0.5 到 +0.5)
            if (Math.random() < 0.20) {
                fluctuation = -(Math.random() * 0.5 + 0.1); 
            } else if (Math.random() > 0.85) {
                fluctuation = (Math.random() * 0.5 + 0.1); 
            } else {
                fluctuation = (Math.random() * 0.6) - 0.3; 
            }
        } else if (tags.includes('stable')) {
            // 大心脏：整体打分区间上移，拿高分的概率大幅增加 (-0.1 到 +0.4)
            fluctuation = (Math.random() * 0.5) - 0.2;
        } else {
            // 普通选手：标准自然波动 (-0.3 到 +0.3)
            fluctuation = (Math.random() * 0.6) - 0.3; 
        }

        let finalScore = baseScore + fluctuation;
        if (finalScore > 10.0) finalScore = 10.0;
        return parseFloat(finalScore.toFixed(1)); 
    },

    // 核心 E 分计算公式
    calculateEScore: function(gymnastId, tracks) {
        const gymnast = gymnastsData.find(g => g.id === gymnastId);
        if (!gymnast) return null;

        const currentBrand = window.currentRoutineData ? window.currentRoutineData.brand : 'gymnova';
        const tags = gymnast.tags || []; // 提取选手的标签，若无则为空数组

        // ==================================================
        // 核心玄学 A：艺术分(AD)计算
        // ==================================================
        let finalAD = gymnast.adMean;
        
        // 30% 概率自然波动 (±0.1)
        let adRand = Math.random();
        if (adRand < 0.15) finalAD += 0.1; 
        else if (adRand < 0.30) finalAD -= 0.1;
        
        finalAD = Math.round(finalAD * 10) / 10;
        if (finalAD < 0) finalAD = 0;

        let report = {
            gymnastNameEn: gymnast.nameEn,
            country: gymnast.country,
            judges: [],           
            averageScore: 0,      
            artisticDeduction: finalAD, 
            fallCount: 0,         
            fallDeduction: 0,     
            fallTrackIds: [],     
            finalEScore: 0        
        };

        // ==================================================
        // 生成裁判平均分 (传入 tags)
        // ==================================================
        for (let i = 0; i < 3; i++) {
            report.judges.push(this.generateJudgeScore(gymnast.edBase, tags));
        }
        let sum = report.judges.reduce((a, b) => a + b, 0);
        report.averageScore = parseFloat((sum / 3).toFixed(3));

        // ==================================================
        // 核心玄学 B：计算最终摔倒概率 (场地 + fall/stable标签)
        // ==================================================
        let fallProbability = 0.08; // 基础 5%
        if (currentBrand === 'taishan') fallProbability += 0.05; // Taishan 地板加 5% 失误率
        
        if (tags.includes('fall')) fallProbability += 0.08; // 易失误加 8%
        if (tags.includes('stable')) fallProbability = Math.max(0.01, fallProbability - 0.02); // 大心脏减 2% 失误率

        tracks.forEach(track => {
            if (track.type === 'line' && track.skills && track.skills.length > 0) {
                if (Math.random() < fallProbability) {
                    report.fallCount++;
                    report.fallDeduction += 1.0; 
                    report.fallTrackIds.push(track.id); 
                }
            }
        });

        // ==================================================
        // 核心玄学 C：计算额外 E 分扣罚 (场地 + strict严扣标签)
        // ==================================================
        let extraEDeduction = 0;
        
        // 特性 1: Spieth 场地暗雷 (30%概率触发 0.1~0.5 随机扣分)
        if (currentBrand === 'spieth') {
            if (Math.random() < 0.1) {
                extraEDeduction += parseFloat((Math.random() * 0.4 + 0.1).toFixed(1));
            }
        }

        // 特性 2: strict 严扣标签 (必定额外扣 0.1~0.3 分)
        if (tags.includes('strict')) {
            extraEDeduction += parseFloat((Math.random() * 0.1).toFixed(1));
        }

        // ==================================================
        // 终极结算
        // ==================================================
        report.finalEScore = report.averageScore - report.artisticDeduction - report.fallDeduction - extraEDeduction;
        
        if (report.finalEScore < 0) report.finalEScore = 0;
        report.finalEScore = parseFloat(report.finalEScore.toFixed(3));

        return report;
    }
};