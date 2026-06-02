// ==========================================
// 自由体操 D分计算引擎 (d_score.js)
// ==========================================

const ChoreographyEngine = {
    diffValues: { 'A': 0.1, 'B': 0.2, 'C': 0.3, 'D': 0.4, 'E': 0.5, 'F': 0.6, 'G': 0.7, 'H': 0.8, 'I': 0.9, 'J': 1.0 },

    calculateDScore: function(tracks) {
        let report = {
            dv: 0, cr: 0, cv: 0, dmtBonus: 0, totalD: 0,
            warnings: [], countedSkills: [],
            crDetails: { cr1: false, cr2: false, cr3: false, cr4: false }
        };

        let allSkills = [];
        let seenIds = new Set();
        let acroLinesCount = 0; 
        let validAcroLines = []; 
        let tuckTurnCount = 0;   

        tracks.forEach(track => {
            // 纯路线工具，跳过不处理
            if (track.type === 'transit') return;

            let isAcroLine = track.type === 'line' && track.skills.length > 0;
            if (isAcroLine) {
                acroLinesCount++;
                if (acroLinesCount <= 4) validAcroLines.push(track);
                else report.warnings.push(`⛔ 规则限制：第 ${acroLinesCount} 串技巧串超出 4 串限制，不计入 DV！`);
            }

            track.skills.forEach(skill => {
                let isDance = skill.id.startsWith('1.') || skill.id.startsWith('2.');
                let isTuckTurn = skill.nameZh.join().includes("蹲转");
                let canCountDV = true;

                if (isAcroLine && acroLinesCount > 4) canCountDV = false;
                if (seenIds.has(skill.id)) {
                    canCountDV = false;
                    report.warnings.push(`⚠️ 动作 [${skill.nameZh[0]}] 重复，只计入第一次 DV。`);
                }
                if (isTuckTurn) {
                    if (tuckTurnCount > 0) {
                        canCountDV = false;
                        report.warnings.push(`⚠️ 蹲转动作全套只能计入一次 DV。`);
                    }
                    tuckTurnCount++;
                }

                if (canCountDV) {
                    seenIds.add(skill.id);
                    allSkills.push({ ...skill, isDance: isDance });
                }
            });
        });

        // 2. 计算 DV
        allSkills.sort((a, b) => this.diffValues[b.difficulty] - this.diffValues[a.difficulty]);
        let danceCount = 0, acroCount = 0;
        
        allSkills.forEach(skill => {
            if (report.countedSkills.length >= 8) return; 
            if (skill.isDance && danceCount < 5) {
                report.countedSkills.push(skill);
                danceCount++;
            } else if (!skill.isDance && acroCount < 5) {
                report.countedSkills.push(skill);
                acroCount++;
            }
        });

        report.countedSkills.forEach(skill => report.dv += this.diffValues[skill.difficulty]);
        if (danceCount < 3) report.warnings.push(`⚠️ 舞蹈不足！当前 ${danceCount}/3 个。`);
        if (acroCount < 3) report.warnings.push(`⚠️ 技巧不足！当前 ${acroCount}/3 个。`);

        // 3. 计算 CR
        this.evaluateCR(tracks, allSkills, report);

        // 4. 计算 下法奖励
        if (acroLinesCount === 1) {
            report.dmtBonus = -0.5; 
            report.warnings.push(`⛔ 只有 1 串技巧，认定为【无下法】，D分扣除 0.5 分！`);
        } else if (acroLinesCount === 2) {
            report.dmtBonus = 0;
            report.warnings.push(`⚠️ 只有 2 串技巧，无法获得 0.2 下法加分（需3串及以上）。`);
        } else if (acroLinesCount >= 3) {
            let lastValidLine = validAcroLines[validAcroLines.length - 1]; 
            let highestDmtVal = -1;
            lastValidLine.skills.forEach(s => {
                let val = this.diffValues[s.difficulty];
                if (val > highestDmtVal) highestDmtVal = val;
            });
            if (highestDmtVal >= 0.4) report.dmtBonus = 0.2;
            else if (highestDmtVal !== -1) report.warnings.push(`💡 最后一串最高难度未达 D 组，缺少下法 0.2 奖励。`);
        }

        // 5. 计算 CV
        report.cv = this.calculateCV(tracks);

        report.totalD = report.dv + report.cr + report.cv + report.dmtBonus;
        report.dv = parseFloat(report.dv.toFixed(2));
        report.cv = parseFloat(report.cv.toFixed(2));
        report.totalD = parseFloat(report.totalD.toFixed(2));

        return report;
    },

    evaluateCR: function(tracks, allSkills, report) {
        let hasFwd = false, hasBwd = false;
        tracks.forEach(track => {
            if (track.type === 'curve' && track.skills.length >= 2) {
                let uniqueSkills = new Set(track.skills.map(s => s.id));
                if (uniqueSkills.size >= 2 && track.skills.some(s => s.tags && s.tags.includes('cr1'))) {
                    report.crDetails.cr1 = true;
                }
            }
        });
        if (!report.crDetails.cr1) report.warnings.push(`⚠️ CR1未满足：缺少舞蹈串(含180°劈叉)。`);

        allSkills.forEach(skill => {
            if (skill.tags) {
                if (skill.tags.includes('cr2')) report.crDetails.cr2 = true;
                if (skill.tags.includes('cr3')) report.crDetails.cr3 = true;
                if (skill.tags.includes('fwd')) hasFwd = true;
                if (skill.tags.includes('bwd')) hasBwd = true;
            }
        });

        if (!report.crDetails.cr2) report.warnings.push(`⚠️ CR2未满足：空翻缺≥360°转体。`);
        if (!report.crDetails.cr3) report.warnings.push(`⚠️ CR3未满足：缺双周空翻。`);
        if (hasFwd && hasBwd) report.crDetails.cr4 = true;
        else report.warnings.push(`⚠️ CR4未满足：成套中需同时包含【向前】和【向后】空翻。`);

        if (report.crDetails.cr1) report.cr += 0.5;
        if (report.crDetails.cr2) report.cr += 0.5;
        if (report.crDetails.cr3) report.cr += 0.5;
        if (report.crDetails.cr4) report.cr += 0.5;
    },

    calculateCV: function(tracks) {
        let cvScore = 0;
        // 将难度字母转换为数值，方便做大小比较：A=1, B=2, C=3, D=4, E=5...
        const getVal = (diff) => this.diffValues[diff] * 10; 

        tracks.forEach(track => {
            if (track.type === 'transit') return; // 纯路线无加分
            
            if (track.skills.length >= 2) {
                // 遍历每个技巧串里相邻的两个动作间隙
                for (let i = 0; i < track.skills.length - 1; i++) {
                    let s1 = track.skills[i];
                    let s2 = track.skills[i+1];
                    let v1 = getVal(s1.difficulty);
                    let v2 = getVal(s2.difficulty);
                    
                    // 读取当前颗粒度连接符 (如果没选则默认 direct)
                    let currentConnectType = 'direct';
                    if (track.connections && track.connections[i]) {
                        currentConnectType = track.connections[i];
                    } else if (track.connectionType) {
                        currentConnectType = track.connectionType;
                    }
                    
                    let isDirect = (currentConnectType === 'direct'); 
                    
                    let type1 = s1.id.startsWith('2.') ? 'turn' : (s1.id.startsWith('1.') ? 'dance' : 'acro');
                    let type2 = s2.id.startsWith('2.') ? 'turn' : (s2.id.startsWith('1.') ? 'dance' : 'acro');

                    if (track.type === 'line') { 
                        // ==========================================
                        // 1. 混合连接 (技巧 + 舞蹈，必须直接)
                        // ==========================================
                        if (type1 === 'acro' && type2 === 'dance' && isDirect) {
                            if (v1 === 4 && v2 >= 2) cvScore += 0.1; // D + B 及以上
                            if (v1 >= 5 && v2 >= 1) cvScore += 0.1;  // E + A 及以上
                        }
                        // ==========================================
                        // 2. 纯技巧连接 (Acro + Acro)
                        // ==========================================
                        else if (type1 === 'acro' && type2 === 'acro') {
                            
                            if (isDirect) { 
                                // 【情况 A： '+' 直接连接】
                                // +0.2 加分 (使用 >= 逻辑)
                                if ((v1 >= 1 && v2 >= 5) || (v1 >= 5 && v2 >= 1)) {
                                    cvScore += 0.2; // A+E 及以上
                                } 
                                else if ((v1 >= 2 && v2 >= 4) || (v1 >= 4 && v2 >= 2)) {
                                    cvScore += 0.2; // B+D 及以上
                                }
                                // +0.1 加分 (弱判定，使用 === 严格匹配，被 else if 隔离)
                                else if ((v1 === 1 && v2 === 4) || (v1 === 4 && v2 === 1)) {
                                    cvScore += 0.1; // 仅限 A+D
                                } 
                                else if (v1 === 3 && v2 === 3) {
                                    cvScore += 0.1; // 仅限 C+C
                                }
                                
                            } else { 
                                // 【情况 B： '++' 间接连接】
                                let matched3Skill = false;
                                
                                // 🌟 独家机制：回溯判定 3 动作序列 (A + A ++ D/E)
                                // 如果当前是间接连接，且前面还有一个动作
                                if (i >= 1) {
                                    let s0 = track.skills[i-1];
                                    let type0 = s0.id.startsWith('2.') ? 'turn' : (s0.id.startsWith('1.') ? 'dance' : 'acro');
                                    let prevConnectType = (track.connections && track.connections[i-1]) ? track.connections[i-1] : (track.connectionType || 'direct');
                                    
                                    // 检查前面的连接是否是“直接”，并且是个技巧动作
                                    if (type0 === 'acro' && prevConnectType === 'direct') {
                                        let v0 = getVal(s0.difficulty);
                                        
                                        // +0.2： A+A++E 以上 (三个动作都要 >= 这个要求)
                                        if (v0 >= 1 && v1 >= 1 && v2 >= 5) {
                                            cvScore += 0.2;
                                            matched3Skill = true;
                                        }
                                        // +0.1： A+A++D (结尾必须严格等于 D，否则如果结尾是E，会在上面被拦击)
                                        else if (v0 >= 1 && v1 >= 1 && v2 === 4) {
                                            cvScore += 0.1;
                                            matched3Skill = true;
                                        }
                                    }
                                }
                                
                                // 只有当没有被上面的“3 动作特殊组合”匹配时，才计算基础的“2 动作间接”
                                if (!matched3Skill) {
                                    // +0.2： C++D 以上
                                    if ((v1 >= 3 && v2 >= 4) || (v1 >= 4 && v2 >= 3)) {
                                        cvScore += 0.2;
                                    }
                                    // +0.1： B++D (严格等于 2 和 4)
                                    else if ((v1 === 2 && v2 === 4) || (v1 === 4 && v2 === 2)) {
                                        cvScore += 0.1;
                                    }
                                }
                            }
                        }
                    } 
                    // ==========================================
                    // 3. 单腿立转连接 (Turn + Turn)
                    // ==========================================
                    else if (track.type === 'point' && type1 === 'turn' && type2 === 'turn' && isDirect) {
                        if (v1 >= 4 && v2 >= 2) cvScore += 0.1;
                    }
                }
            }
        });
        return parseFloat(cvScore.toFixed(2));
    }
};