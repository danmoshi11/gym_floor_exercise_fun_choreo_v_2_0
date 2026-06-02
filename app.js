// ==========================================
// 自由体操系统 中枢控制台 (app.js)
// ==========================================

const AppController = {
    modal: {
        currentTrackId: null,
        skills: [],
        connectionType: 'direct'
    },

    init: function() {
        this.renderDictionary(skillsData);
        this.renderHistory();
        document.getElementById('searchInput').addEventListener('input', () => this.filterDictionary());
        document.getElementById('groupFilter').addEventListener('change', () => this.filterDictionary());
        document.getElementById('diffFilter').addEventListener('change', () => this.filterDictionary());
    
        // 【新增】初始化加载选手名单
        const selector = document.getElementById('gymnastSelector');
        if (selector && typeof gymnastsData !== 'undefined') {
            gymnastsData.forEach(g => {
                const option = document.createElement('option');
                option.value = g.id;
                option.textContent = `${g.country} | ${g.nameEn}`;
                selector.appendChild(option);
            });
        }
        window.currentRoutineData = window.currentRoutineData || {};
        this.setGymnastMode('none');
    },

    // ==========================================
    // 附加模块：选手身份管家与国旗 Emoji 引擎
    // ==========================================
    // ==========================================
    // 附加模块：选手身份管家与国旗引擎 (使用 FlagCDN 突破 Windows 限制)
    // ==========================================
    getFlag: function(code) {
        // 映射国家代码到 ISO 3166-1 alpha-2 格式
        const flagMap = {
            'CHN': 'cn', 'USA': 'us', 'BRA': 'br', 'FRA': 'fr', 'ITA': 'it', 'JPN': 'jp',
            'GBR': 'gb', 'ROU': 'ro', 'CAN': 'ca', 'PHI': 'ph', 'KOR': 'kr', 'NED': 'nl',
            'AUS': 'au', 'ESP': 'es', 'GER': 'de', 'ALG': 'dz', 'AUT': 'at', 'BEL': 'be',
            'COL': 'co', 'CZE': 'cz', 'EGY': 'eg', 'HAI': 'ht', 'HUN': 'hu', 'MEX': 'mx',
            'NZL': 'nz', 'PAN': 'pa', 'POR': 'pt', 'PRK': 'kp', 'RSA': 'za', 'SLO': 'si',
            'SUI': 'ch', 'UKR': 'ua'
        };
        const iso = flagMap[code];
        if (iso) {
            // 直接返回高清国旗图片标签
            return `<img src="https://flagcdn.com/w40/${iso}.png" class="inline-block w-5 h-3.5 rounded-[2px] object-cover shadow-sm align-middle" alt="${code}">`;
        }
        return '🏳️'; 
    },

    setGymnastMode: function(mode) {
        window.currentRoutineData.gymnastMode = mode;
        const display = document.getElementById('setupGymnastDisplay');
        const customInput = document.getElementById('customGymnastNameInput');
        const avatarBox = document.getElementById('setupGymnastAvatar');
        
        if (mode === 'none') {
            display.classList.remove('hidden');
            if(customInput) customInput.classList.add('hidden');
            avatarBox.innerHTML = '<span class="text-slate-400">🙈</span>';
            document.getElementById('setupGymnastFlag').innerHTML = '';
            document.getElementById('setupGymnastName').innerText = '纯排位测试 (无E分)';
            document.getElementById('setupGymnastStats').innerText = '系统将仅计算 D 分';
        } else if (mode === 'custom') {
            display.classList.add('hidden');
            if(customInput) customInput.classList.remove('hidden');
        } else {
            // 从数据库选定
            const g = gymnastsData.find(x => x.id === mode);
            display.classList.remove('hidden');
            if(customInput) customInput.classList.add('hidden');
            
            // 【核心修改】：动态拼接 assets 路径，并加上 onerror 容错保护
            const imgPath = `./assets/${g.id}.png`; // 如果你存的是 jpg，请改为 .jpg
            avatarBox.innerHTML = `<img src="${imgPath}" class="w-full h-full object-cover" onerror="this.outerHTML='<span class=\\'text-slate-300\\'>👤</span>'">`;
            
            document.getElementById('setupGymnastFlag').innerHTML = this.getFlag(g.country);
            document.getElementById('setupGymnastName').innerText = g.nameEn;
            document.getElementById('setupGymnastStats').innerText = `已载入该选手专属模型`;
        }
    },

    openGymnastModal: function() {
        document.getElementById('gymnastModal').classList.remove('hidden');
        this.renderGymnastList(gymnastsData);
        
        // 绑定搜索逻辑
        document.getElementById('gymnastSearch').oninput = (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = gymnastsData.filter(g => 
                g.nameEn.toLowerCase().includes(q) || g.country.toLowerCase().includes(q)
            );
            this.renderGymnastList(filtered);
        };
    },

    closeGymnastModal: function() {
        document.getElementById('gymnastModal').classList.add('hidden');
    },

    renderGymnastList: function(data) {
        const grid = document.getElementById('gymnastListGrid');
        grid.innerHTML = '';
        if (data.length === 0) {
            grid.innerHTML = '<p class="col-span-full text-center text-slate-400 py-10">未找到相关选手...</p>';
            return;
        }
        data.forEach(g => {
            const flag = this.getFlag(g.country);
            const imgPath = `./assets/${g.id}.png`; // 这里拼接路径
            
            grid.innerHTML += `
                <div onclick="AppController.selectGymnast('${g.id}')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-400 cursor-pointer flex items-center gap-4 transition-all transform hover:-translate-y-1">
                    <div class="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex justify-center items-center text-3xl shadow-inner">
                        <img src="${imgPath}" class="w-full h-full object-cover" onerror="this.outerHTML='<span class=\\'text-slate-300 flex items-center justify-center w-full h-full\\'>👤</span>'">
                    </div>
                    <div class="flex-1 overflow-hidden">
                        <div class="text-[10px] font-bold text-slate-400 mb-0.5 tracking-widest flex items-center gap-1">${g.country}</div>
                        <div class="font-black text-slate-800 text-base truncate flex items-center gap-2" title="${g.nameEn}">
                            <span>${flag}</span>
                            <span class="truncate">${g.nameEn}</span>
                        </div>
                        <div class="text-xs text-blue-600 font-bold mt-1 bg-blue-50 inline-block px-2 py-0.5 rounded-md border border-blue-100">已内置数据</div>
                    </div>
                </div>
            `;
        });
    },

    selectGymnast: function(id) {
        this.setGymnastMode(id);
        this.closeGymnastModal();
    },

    // 【新增】监听选手选择下拉框变化
    handleGymnastChange: function() {
        const val = document.getElementById('gymnastSelector').value;
        const customInput = document.getElementById('customGymnastName');
        if (val === 'custom') {
            customInput.classList.remove('hidden');
        } else {
            customInput.classList.add('hidden');
        }
    },
    

    renderDictionary: function(data) {
        const grid = document.getElementById('skillsGrid');
        grid.innerHTML = '';
        if (data.length === 0) {
            grid.innerHTML = `<p class="col-span-full text-center py-10 text-gray-400">未找到匹配的动作</p>`;
            return;
        }
        data.forEach(skill => {
            const isAcro = skill.id.startsWith('4.') || skill.id.startsWith('5.');
            const bgClass = isAcro ? 'bg-blue-50' : 'bg-green-50'; 
            grid.innerHTML += `
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div class="${bgClass} p-2 flex justify-center">
                        <img src="${skill.image}" class="h-24 object-contain mix-blend-multiply" alt="${skill.nameZh[0]}">
                    </div>
                    <div class="p-3">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-xs font-mono text-gray-400">ID: ${skill.id}</span>
                            <span class="px-2 py-0.5 bg-diff-${skill.difficulty} text-white font-bold rounded-md text-xs">${skill.difficulty} (${skill.value})</span>
                        </div>
                        <h4 class="font-bold text-gray-800 text-sm mb-1 truncate" title="${skill.nameZh[0]}">${skill.nameZh[0]}</h4>
                    </div>
                </div>
            `;
        });
    },

    filterDictionary: function() {
        const query = document.getElementById('searchInput').value.toLowerCase();
        const group = document.getElementById('groupFilter').value;
        const diff = document.getElementById('diffFilter').value;
        const filtered = skillsData.filter(skill => {
            const matchName = skill.nameZh.join(" ").toLowerCase().includes(query) || skill.nameEn.toLowerCase().includes(query);
            const matchGroup = group === 'all' || skill.id.startsWith(group + '.');
            const matchDiff = diff === 'all' || skill.difficulty === diff;
            return matchName && matchGroup && matchDiff;
        });
        this.renderDictionary(filtered);
    },

    openModal: function(track) {
        if (track.type === 'transit') {
            canvasManager.updateTrackSkills(track.id, [{nameZh: ["移动路线"], difficulty: "-"}], 'direct');
            this.updateUIRoutineList();
            return;
        }

        this.modal.currentTrackId = track.id;
        
        // 判定是新创建还是再编辑
        const isEditing = track.skills && track.skills.length > 0;
        
        this.modal.skills = track.skills ? [...track.skills] : [];
        this.modal.connections = track.connections ? [...track.connections] : 
                                 Array(Math.max(0, this.modal.skills.length - 1)).fill('direct');
        
        document.getElementById('skillModal').classList.remove('hidden');
        
        let availableSkills = [];
        let title = "";
        let prefix = isEditing ? "✏️ 修改" : "➕ 配置";
        
        if (track.type === 'line') {
            title = `${prefix}技巧空翻串`;
            availableSkills = skillsData.filter(s => /^[345]\./.test(s.id));
        } else if (track.type === 'curve') {
            title = `${prefix}舞蹈跳步串`;
            availableSkills = skillsData.filter(s => s.id.startsWith('1.'));
        } else if (track.type === 'point') {
            title = `${prefix}定点立转`;
            availableSkills = skillsData.filter(s => s.id.startsWith('2.'));
        }

        // 如果是编辑态，算出它是第几条线，并在标题显示
        if (isEditing) {
            let trackIndex = canvasManager.tracks.findIndex(t => t.id === track.id) + 1;
            title = `${title} (路线 ${trackIndex})`;
        }

        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalConfirmBtn').innerText = isEditing ? "保存修改" : "写入画板";

        this.generateRecommendations(track.type);
        this.renderModalList(availableSkills);
        this.updateCartUI();

        document.getElementById('modalSearch').oninput = (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = availableSkills.filter(s => s.nameZh.join(" ").toLowerCase().includes(q));
            this.renderModalList(filtered);
        };
    },

    generateRecommendations: function(trackType) {
        const bar = document.getElementById('recommendationBar');
        bar.innerHTML = '';
        let recs = [];
        if (trackType === 'line') {
            const lineCount = canvasManager.tracks.filter(t => t.type === 'line').length;
            if (lineCount === 1) recs = skillsData.filter(s => /^[45]\./.test(s.id) && ['F','G','H','I','J'].includes(s.difficulty));
            else if (lineCount === 2) recs = skillsData.filter(s => /^[45]\./.test(s.id) && ['E','F'].includes(s.difficulty));
            else recs = skillsData.filter(s => /^[45]\./.test(s.id) && ['C','D'].includes(s.difficulty));
        } else if (trackType === 'curve') {
            recs = skillsData.filter(s => s.id.startsWith('1.') && s.tags && s.tags.includes('cr1'));
        } else {
            recs = skillsData.filter(s => s.id.startsWith('2.') && ['C','D','E'].includes(s.difficulty));
        }
        recs.sort(() => 0.5 - Math.random()).slice(0, 5).forEach(skill => {
            bar.innerHTML += `<button onclick="AppController.addToCart('${skill.id}')" class="flex-shrink-0 bg-white border border-blue-200 hover:border-blue-500 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm transition-colors"><span class="text-xs font-bold text-blue-600">${skill.difficulty}</span><span class="text-sm text-gray-700">${skill.nameZh[0]}</span></button>`;
        });
    },

    renderModalList: function(skills) {
        const list = document.getElementById('modalSkillList');
        list.innerHTML = '';
        skills.forEach(skill => {
            list.innerHTML += `
                <div onclick="AppController.addToCart('${skill.id}')" class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer flex justify-between items-center transition-all hover:border-blue-300">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[10px] font-mono bg-gray-100 px-1.5 rounded text-gray-500">${skill.id}</span>
                            <span class="text-xs font-bold bg-diff-${skill.difficulty} text-white px-1.5 rounded">${skill.difficulty}</span>
                        </div>
                        <h4 class="font-bold text-gray-800 text-sm">${skill.nameZh[0]}</h4>
                    </div>
                    <img src="${skill.image}" class="h-10 w-10 object-contain mix-blend-multiply opacity-50">
                </div>
            `;
        });
    },

    addToCart: function(skillId) {
        if (this.modal.skills.length >= 6) { alert("一条轨迹最多配置 6 个动作！"); return; }
        const fullSkillObj = skillsData.find(s => s.id === skillId);
        if (!fullSkillObj) return;

        this.modal.skills.push(fullSkillObj);
        if (this.modal.skills.length > 1) this.modal.connections.push('direct');
        this.updateCartUI();
    },

    removeFromCart: function(index) {
        this.modal.skills.splice(index, 1);
        if (this.modal.connections.length > 0) {
            let connIndex = Math.max(0, index - 1);
            this.modal.connections.splice(connIndex, 1);
        }
        this.updateCartUI();
    },

    toggleConnection: function(index) {
        this.modal.connections[index] = this.modal.connections[index] === 'direct' ? 'indirect' : 'direct';
        this.updateCartUI();
    },

    updateCartUI: function() {
        const cart = document.getElementById('modalCurrentQueue');
        if (!cart) return;
        cart.innerHTML = '';
        if (this.modal.skills.length === 0) {
            cart.innerHTML = '<span class="text-gray-400 text-sm">尚未选择动作...</span>';
            return;
        }
        this.modal.skills.forEach((skill, index) => {
            cart.innerHTML += `
                <div class="flex items-center gap-1 bg-white px-3 py-1.5 rounded border border-gray-200 shadow-sm shrink-0">
                    <span class="text-xs font-bold text-blue-600">${skill.difficulty}</span>
                    <span class="text-sm text-gray-700">${skill.nameZh[0]}</span>
                    <button onclick="AppController.removeFromCart(${index})" class="text-red-400 hover:text-red-600 ml-1">&times;</button>
                </div>`;
            if (index < this.modal.skills.length - 1) {
                let isDirect = this.modal.connections[index] === 'direct';
                let symbol = isDirect ? '+' : '++';
                let colorClass = isDirect ? 'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200' : 'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200';
                cart.innerHTML += `<button onclick="AppController.toggleConnection(${index})" class="px-2 py-0.5 text-xs font-black rounded border cursor-pointer transition-colors ${colorClass}">${symbol}</button>`;
            }
        });
    },

    confirmModal: function() {
        const track = canvasManager.tracks.find(t => t.id === this.modal.currentTrackId);
        if (track) {
            track.skills = [...this.modal.skills];
            track.connections = [...this.modal.connections]; 
            canvasManager.redraw();
        }
        this.closeModal();
        this.updateUIRoutineList(); 
    },

    closeModal: function() {
        document.getElementById('skillModal').classList.add('hidden');
        if (this.modal.currentTrackId) {
            const track = canvasManager.tracks.find(t => t.id === this.modal.currentTrackId);
            if (track && track.skills.length === 0) {
                canvasManager.tracks = canvasManager.tracks.filter(t => t.id !== this.modal.currentTrackId);
                canvasManager.redraw();
            }
        }
    },

    updateUIRoutineList: function() {
        const list = document.getElementById('routineList');
        let html = '';
        let validCount = 0;

        canvasManager.tracks.forEach((track, index) => {
            if (track.skills.length === 0) return;
            
            if (track.type === 'transit') {
                html += `
                    <div class="flex items-center justify-between p-2 border border-gray-100 bg-gray-50 rounded">
                        <div class="flex-1 text-sm text-gray-400 italic">🚶‍♀️ ${index + 1}. 移动路线 (无难度)</div>
                        <button onclick="AppController.deleteTrack('${track.id}')" class="text-gray-400 hover:text-red-500">🗑️</button>
                    </div>`;
                return;
            }

            const connector = track.connectionType === 'direct' ? ' + ' : ' / ';
            
            const skillsText = track.skills.map((s, skillIndex) => 
                `<span class="group relative inline-flex items-center hover:bg-gray-200 px-1 rounded transition-colors cursor-pointer">
                    <span class="font-bold text-gray-800">${s.nameZh[0]}</span> 
                    <span class="text-[10px] bg-gray-200 group-hover:bg-gray-300 px-1 rounded ml-1">${s.difficulty}</span>
                    <button onclick="AppController.removeSkillFromTrack('${track.id}', ${skillIndex})" class="hidden group-hover:flex absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 text-[10px] items-center justify-center shadow z-10">&times;</button>
                </span>`
            ).join(connector);
            
            let icon = track.type === 'line' ? '📏' : (track.type === 'curve' ? '〰️' : '📍');
            let ndWarning = track.nd < 0 ? `<span class="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold ml-2 shadow-sm border border-red-200 shrink-0">出界 ${track.nd}</span>` : '';
            validCount += track.skills.length;

            html += `
                <div class="flex items-center justify-between p-2 border-b border-gray-50 hover:bg-gray-50 rounded">
                    <div class="flex items-center gap-2 overflow-hidden pr-2">
                        <div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0" style="color: ${track.color}">${index + 1}</div>
                        <div class="text-sm leading-relaxed flex items-center flex-wrap gap-y-1">${icon} <span class="mx-1"></span> ${skillsText} ${ndWarning}</div>
                    </div>
                    <button onclick="AppController.deleteTrack('${track.id}')" class="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 shrink-0">🗑️</button>
                </div>
            `;
        });

        if (html === '') html = '<p class="text-center text-gray-400 py-10">在左侧场地上画线开始编排</p>';
        list.innerHTML = html;
        document.getElementById('skillCount').innerText = `${validCount}/8 有效`;
        
        this.runScoringEngine();
    },

    deleteTrack: function(trackId) {
        canvasManager.tracks = canvasManager.tracks.filter(t => t.id !== trackId);
        canvasManager.redraw();
        this.updateUIRoutineList();
    },

    removeSkillFromTrack: function(trackId, skillIndex) {
        const track = canvasManager.tracks.find(t => t.id === trackId);
        if (track) {
            track.skills.splice(skillIndex, 1);
            if (track.connections && track.connections.length > 0) {
                let connIndex = Math.max(0, skillIndex - 1);
                track.connections.splice(connIndex, 1);
            }
            if (track.skills.length === 0) this.deleteTrack(trackId);
            else { canvasManager.redraw(); this.updateUIRoutineList(); }
        }
    },

    runScoringEngine: function() {
        const report = ChoreographyEngine.calculateDScore(canvasManager.tracks);
        let totalND = canvasManager.tracks.reduce((sum, t) => sum + (t.nd || 0), 0);

        document.getElementById('score-totalD').innerText = report.totalD.toFixed(2);
        document.getElementById('score-dv').innerText = report.dv.toFixed(2);
        document.getElementById('score-cr').innerText = report.cr.toFixed(2);
        document.getElementById('score-cv').innerText = report.cv.toFixed(2);
        document.getElementById('score-dmt').innerText = report.dmtBonus.toFixed(2);
        document.getElementById('score-nd').innerText = totalND.toFixed(2);

        const warningPanel = document.getElementById('warningsPanel');
        if (report.warnings.length > 0) {
            warningPanel.classList.remove('hidden');
            warningPanel.innerHTML = report.warnings.map(w => `<p>• ${w}</p>`).join('');
        } else {
            warningPanel.classList.add('hidden');
        }
        window.currentScoreReport = report;
    },

    // ==========================================
    // 模块四：“成套亮相”动画分发器
    // ==========================================
    triggerFinishAnimation: function() {
        if(canvasManager.tracks.length === 0) { alert("你还没编排动作呢！"); return; }
        
        // 【关键】直接从全局状态里读，不再读 select 标签
        const mode = window.currentRoutineData.gymnastMode || 'none';
        
        if (mode === 'none') {
            window.currentRoutineData.gymnastName = "无";
            window.currentEScoreReport = null; 
            this.playShowcase();
        } else if (mode === 'custom') {
            const customName = document.getElementById('customGymnastNameInput').value || "佚名选手";
            window.currentRoutineData.gymnastName = customName;
            document.getElementById('customScoreModal').classList.remove('hidden');
        } else {
            const gymnast = gymnastsData.find(g => g.id === mode);
            if (!gymnast) return;
            window.currentRoutineData.gymnastName = gymnast.nameEn;
            window.currentEScoreReport = ExecutionEngine.calculateEScore(mode, canvasManager.tracks);
            this.playShowcase();
        }
    },
    
    // 【新增】处理自定义填分提交
    confirmCustomScore: function() {
        const val = parseFloat(document.getElementById('customEScoreInput').value);
        if (isNaN(val) || val < 0 || val > 10) {
            alert("请输入 0 到 10 之间的有效 E 分！");
            return;
        }
        document.getElementById('customScoreModal').classList.add('hidden');
        
        // 伪造一个数据给动画和算分面板
        window.currentEScoreReport = {
            gymnastNameEn: window.currentRoutineData.gymnastName,
            isCustom: true,
            fallTrackIds: [], // 自定义选手不进行随机摔倒判定
            finalEScore: val
        };
        this.playShowcase();
    },

    playShowcase: function() {
        const container = document.getElementById('floorContainer');
        const overlay = document.createElement('div');
        overlay.id = "showcaseOverlay";
        overlay.className = "absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-md text-white font-black tracking-widest pointer-events-none transition-opacity duration-500 opacity-0";
        overlay.innerHTML = `<span class="text-5xl md:text-6xl drop-shadow-2xl scale-50 transition-transform duration-500" id="showcaseText">✨成套亮相✨</span>`;
        container.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.remove('opacity-0');
            document.getElementById('showcaseText').classList.remove('scale-50');
            document.getElementById('showcaseText').classList.add('scale-100');
        });

        setTimeout(() => {
            overlay.classList.add('opacity-0');
            setTimeout(() => { if (container.contains(overlay)) container.removeChild(overlay); }, 500);

            // 把计算好的摔跤数组传给动画播放器
            let fallIds = window.currentEScoreReport ? window.currentEScoreReport.fallTrackIds : [];
            
            canvasManager.playHighlightAnimation(() => {
                overlay.classList.add('opacity-0');
                setTimeout(() => container.removeChild(overlay), 500);
                
                // 动画结束，结算终极成绩
                let dReport = window.currentScoreReport;
                let eReport = window.currentEScoreReport;
                let ndDeduction = canvasManager.tracks.reduce((sum, t) => sum + (t.nd || 0), 0);
                // 总分 = D分 + E分 - 出界分
                let finalTotalScore = (dReport.totalD + eReport.finalEScore + ndDeduction).toFixed(3);
                
                // 将成绩渲染到弹窗面板上
                document.getElementById('saveModalTotalScore').innerText = finalTotalScore;
                document.getElementById('saveModalDScore').innerText = dReport.totalD.toFixed(3);
                document.getElementById('saveModalEScore').innerText = eReport.finalEScore.toFixed(3);

                // 保存海报与历史记录
                this.saveRoutineToHistory(finalTotalScore); // 这里传了最终分！
                this.exportToImage();
                document.getElementById('saveConfirmModal').classList.remove('hidden');
                
            }, fallIds); 
        }, 800); 
    },

    saveRoutineToHistory: function() {
        let history = JSON.parse(localStorage.getItem('gymChoreoHistory') || '[]');
        let routine = {
            id: 'routine_' + Date.now(),
            name: window.currentRoutineData?.name || "未命名成套",
            brand: window.currentRoutineData?.brand || "gymnova",
            date: new Date().toLocaleDateString(),
            score: window.currentScoreReport.totalD.toFixed(2),
            tracks: canvasManager.tracks 
        };
        history.unshift(routine); 
        localStorage.setItem('gymChoreoHistory', JSON.stringify(history));
        this.renderHistory();
    },

    renderHistory: function() {
        const grid = document.getElementById('historyGrid');
        let history = JSON.parse(localStorage.getItem('gymChoreoHistory') || '[]');
        if (history.length === 0) {
            grid.innerHTML = '<p class="text-gray-400 col-span-full">暂无保存的成套，去“战术画板”编排一套吧！</p>';
            return;
        }
        grid.innerHTML = '';
        history.forEach(routine => {
            grid.innerHTML += `
                <div class="bg-gray-50 border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-black text-lg text-gray-800 truncate pr-4">${routine.name}</h4>
                        <span class="bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded text-sm shrink-0">D分 ${routine.score}</span>
                    </div>
                    <p class="text-xs text-gray-500 mb-4">创建时间: ${routine.date} | 场地: ${routine.brand}</p>
                    <div class="flex gap-2">
                        <button class="flex-1 bg-white border border-gray-300 text-sm font-bold py-2 rounded-lg text-gray-600 opacity-50 cursor-not-allowed">加载到画板 (开发中)</button>
                        <button onclick="AppController.deleteHistory('${routine.id}')" class="bg-red-50 text-red-500 px-3 rounded-lg hover:bg-red-100">🗑️</button>
                    </div>
                </div>
            `;
        });
    },

    deleteHistory: function(id) {
        if(confirm("确定要删除这条成套记录吗？")) {
            let history = JSON.parse(localStorage.getItem('gymChoreoHistory') || '[]');
            history = history.filter(r => r.id !== id);
            localStorage.setItem('gymChoreoHistory', JSON.stringify(history));
            this.renderHistory();
        }
    },

    exportToImage: function() {
        const targetDOM = document.getElementById('viewBuilder');
        if (!targetDOM || typeof html2canvas === 'undefined') return;

        const watermark = document.createElement('div');
        watermark.innerHTML = `<h2 class="text-2xl font-black">GymChoreo 智能编排</h2><p class="text-lg">成套：${window.currentRoutineData?.name} | D分: ${window.currentScoreReport.totalD.toFixed(2)}</p>`;
        watermark.className = "absolute bottom-10 right-10 text-gray-400 opacity-50 pointer-events-none";
        targetDOM.appendChild(watermark);

        html2canvas(targetDOM, { backgroundColor: '#f9fafb', scale: 2 }).then(canvas => {
            let link = document.createElement('a');
            link.download = `GymChoreo_${window.currentRoutineData?.name || '编排'}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            targetDOM.removeChild(watermark);
        });
    },

    processOOB: function(choice) {
        const track = window.pendingOOBTrack;
        document.getElementById('oobModal').classList.add('hidden');
        if (!track) return;

        if (choice === 'single') track.nd = -0.1;
        else if (choice === 'double') track.nd = -0.3;
        else if (choice === 'snap') {
            const marginX = canvasManager.canvas.width / 14 + 1;
            const marginY = canvasManager.canvas.height / 14 + 1;
            track.points = track.points.map(p => ({
                x: Math.max(marginX, Math.min(canvasManager.canvas.width - marginX, p.x)),
                y: Math.max(marginY, Math.min(canvasManager.canvas.height - marginY, p.y))
            }));
            track.nd = 0;
        }

        // 【关键修复】查重保护机制！
        // 如果这本身就是一条旧线（通过拖拽触发），不要重复 push。只在画新线出界时 push。
        if (!canvasManager.tracks.includes(track)) {
            canvasManager.tracks.push(track);
        }

        canvasManager.redraw();
        window.pendingOOBTrack = null;
        
        // 智能分流：如果是新画的线出界，弹窗配动作；如果是旧线拖拽出界，只静默刷新侧边栏算分即可
        if (!track.skills || track.skills.length === 0) {
            this.openModal(track);
        } else {
            this.updateUIRoutineList();
        }
    }
};

window.addEventListener('DOMContentLoaded', () => { AppController.init(); });
window.openSkillModal = function(track) { AppController.openModal(track); };
window.closeModal = function() { AppController.closeModal(); };
window.confirmModalSelection = function() { AppController.confirmModal(); };
window.updateUIRoutineList = function() { AppController.updateUIRoutineList(); };
window.saveRoutine = function() { AppController.triggerFinishAnimation(); };
window.startNewRoutine = function() {
    document.getElementById('saveConfirmModal').classList.add('hidden');
    if (typeof window.resetBuilderFlow === 'function') window.resetBuilderFlow();
};
window.renderHistory = function() { AppController.renderHistory(); };
window.handleOOBChoice = function(choice) { AppController.processOOB(choice); };
window.AppController = AppController;