// ==========================================
// 自由体操场地视觉与绘画引擎 (canvas.js)
// ==========================================

const canvasManager = {
    canvas: null,
    ctx: null,
    isDrawing: false,
    dragDist: 0, 
    currentTool: 'line', 
    
    // 【新增】专门用于拖拽功能的状态锁
    draggingTrack: null,
    lastDragPos: null,
    
    tempPath: [], 
    tracks: [], 
    showcaseMarks: [],
    morandiColors: ['#8D99AE', '#D4A373', '#A7C957', '#E5989B', '#9C89B8', '#6C7A89', '#F2CC8F', '#B5C4B1'],
    
    init: function() {
        this.canvas = document.getElementById('floorCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.addEventListener('mousedown', this.startDraw.bind(this));
        this.canvas.addEventListener('mousemove', this.drawing.bind(this));
        this.canvas.addEventListener('mouseup', this.endDraw.bind(this));
        this.canvas.addEventListener('mouseleave', this.endDraw.bind(this));
        
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        this.redraw();
    },

    handleTouchStart: function(e) { e.preventDefault(); this.startDraw(e.touches[0]); },
    handleTouchMove: function(e) { e.preventDefault(); this.drawing(e.touches[0]); },
    handleTouchEnd: function(e) { e.preventDefault(); this.endDraw(); },
    setTool: function(toolName) { this.currentTool = toolName; },

    clearAll: function() {
        this.tracks = [];
        this.tempPath = [];
        this.showcaseMarks = [];
        this.redraw();
        if (typeof window.updateUIRoutineList === 'function') window.updateUIRoutineList();
    },

    getMousePos: function(evt) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (evt.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (evt.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    },

    pointToSegmentDist: function(px, py, x1, y1, x2, y2) {
        let l2 = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    },

    findHitTrack: function(pos) {
        for (let i = this.tracks.length - 1; i >= 0; i--) {
            let t = this.tracks[i];
            if (t.type === 'point') {
                if (Math.hypot(pos.x - t.points[0].x, pos.y - t.points[0].y) < 20) return t;
            } else {
                for (let j = 0; j < t.points.length - 1; j++) {
                    let d = this.pointToSegmentDist(pos.x, pos.y, t.points[j].x, t.points[j].y, t.points[j+1].x, t.points[j+1].y);
                    if (d < 15) return t; 
                }
            }
        }
        return null;
    },

    startDraw: function(e) {
        const pos = this.getMousePos(e);
        
        // 【核心】拖拽模式入口
        if (this.currentTool === 'move') {
            let hit = this.findHitTrack(pos);
            if (hit) {
                this.draggingTrack = hit;
                this.lastDragPos = pos;
                this.isDrawing = true;
            }
            return; // 成功拦截，不进入下方画线逻辑
        }

        this.isDrawing = true;
        this.tempPath = [pos];
        this.dragDist = 0; 

        if (this.currentTool === 'point') {
            this.isDrawing = false;
            let hit = this.findHitTrack(pos);
            if (hit) {
                this.tempPath = [];
                if (typeof window.openSkillModal === 'function') window.openSkillModal(hit);
            } else {
                this.finishPath();
            }
        }
    },

    drawing: function(e) {
        if (!this.isDrawing) return;
        const pos = this.getMousePos(e);
        
        // 【核心】拖拽过程（矩阵平移计算）
        if (this.currentTool === 'move' && this.draggingTrack) {
            const dx = pos.x - this.lastDragPos.x;
            const dy = pos.y - this.lastDragPos.y;
            
            // 将线上所有的点统一累加坐标偏移量
            this.draggingTrack.points.forEach(p => {
                p.x += dx;
                p.y += dy;
            });
            
            this.lastDragPos = pos;
            this.redraw();
            return;
        }

        let lastPt = this.tempPath[this.tempPath.length - 1];
        this.dragDist += Math.hypot(pos.x - lastPt.x, pos.y - lastPt.y);

        if (this.currentTool === 'line') this.tempPath[1] = pos;
        else this.tempPath.push(pos);
        this.redraw();
    },

    endDraw: function() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        // 【核心】拖拽结束
        if (this.currentTool === 'move' && this.draggingTrack) {
            // 重新运行一次界外检测，看看拖拽后有没有出界
            const marginX = this.canvas.width / 14; 
            const marginY = this.canvas.height / 14; 
            let isOOB = this.draggingTrack.points.some(p => p.x < marginX || p.x > this.canvas.width - marginX || p.y < marginY || p.y > this.canvas.height - marginY);
            
            if (isOOB && this.draggingTrack.type !== 'transit') {
                window.pendingOOBTrack = this.draggingTrack;
                document.getElementById('oobModal').classList.remove('hidden');
            } else {
                this.draggingTrack.nd = 0; // 回到界内，清除越界扣分
            }
            
            this.draggingTrack = null;
            this.redraw();
            // 触发侧边栏 UI 更新（包含扣分的变动）
            if (typeof window.updateUIRoutineList === 'function') window.updateUIRoutineList();
            return;
        }

        if (this.dragDist < 5 && this.currentTool !== 'point') {
            let hit = this.findHitTrack(this.tempPath[0]);
            if (hit) {
                this.tempPath = []; 
                this.redraw();
                if (typeof window.openSkillModal === 'function') window.openSkillModal(hit);
                return;
            }
        }

        this.finishPath();
    },

    finishPath: function() {
        if (this.tempPath.length < 1) return;
        if (this.currentTool !== 'point' && this.tempPath.length < 2) {
            this.tempPath = [];
            this.redraw();
            return;
        }

        if (this.currentTool === 'line') {
            const dx = this.tempPath[1].x - this.tempPath[0].x;
            const dy = this.tempPath[1].y - this.tempPath[0].y;
            if (Math.sqrt(dx*dx + dy*dy) < 30) {
                this.tempPath = [];
                this.redraw();
                return;
            }
        }

        const marginX = this.canvas.width / 14; 
        const marginY = this.canvas.height / 14; 
        let isOOB = this.tempPath.some(p => p.x < marginX || p.x > this.canvas.width - marginX || p.y < marginY || p.y > this.canvas.height - marginY);

        let trackColor = this.currentTool === 'transit' ? '#9ca3af' : this.morandiColors[this.tracks.length % this.morandiColors.length];
        
        const newTrack = {
            id: 'track_' + Date.now() + '_' + Math.random(),
            type: this.currentTool,
            points: [...this.tempPath],
            color: trackColor,
            skills: [],
            connectionType: 'direct',
            nd: 0 
        };

        this.tempPath = [];

        if (isOOB && this.currentTool !== 'transit') {
            window.pendingOOBTrack = newTrack;
            document.getElementById('oobModal').classList.remove('hidden');
            this.redraw();
            return;
        }

        this.tracks.push(newTrack);
        this.redraw();
        if (typeof window.openSkillModal === 'function') window.openSkillModal(newTrack);
    },

    updateTrackSkills: function(trackId, skills, connectionType) {
        const track = this.tracks.find(t => t.id === trackId);
        if (track) {
            track.skills = skills;
            track.connectionType = connectionType;
            this.redraw(); 
            if (typeof window.updateUIRoutineList === 'function') window.updateUIRoutineList();
        }
    },

    redraw: function(highlightIndex = -1, progress = -1) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const marginX = this.canvas.width / 14;
        const marginY = this.canvas.height / 14;
        this.ctx.save();
        const container = document.getElementById('floorContainer');
        if (container) {
            this.ctx.strokeStyle = getComputedStyle(container).borderColor;
        } else {
            this.ctx.strokeStyle = "#ffffff"; // 兜底颜色
        }
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([12, 12]);
        this.ctx.strokeRect(marginX, marginY, this.canvas.width - marginX*2, this.canvas.height - marginY*2);
        this.ctx.restore();
        
        this.tracks.forEach((track, index) => {
            let isDimmed = (highlightIndex !== -1 && highlightIndex !== index);
            let isHighlighted = (highlightIndex === index);
            this.drawTrack(track, index, isDimmed, isHighlighted, progress);
        });

        if (this.tempPath.length > 0) this.drawTempPath();

        // 【新增】绘制成功或失败的标记 (防崩溃渲染)
        if (this.showcaseMarks && Array.isArray(this.showcaseMarks) && this.showcaseMarks.length > 0) {
            this.ctx.save();
            this.ctx.font = "24px sans-serif";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.shadowColor = "rgba(255,255,255,0.8)";
            this.ctx.shadowBlur = 10;
            
            this.showcaseMarks.forEach(mark => {
                // 确保 mark 数据完整，防止 Canvas 绘制 API 报错卡死
                if(mark && mark.x !== undefined && mark.y !== undefined) {
                    this.ctx.fillText(mark.type === 'fall' ? '❌' : '✅', mark.x, mark.y);
                }
            });
            this.ctx.restore();
        }    
    },

    drawTrack: function(track, index, isDimmed, isHighlighted, progress) {
        const ctx = this.ctx;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (track.type === 'transit') {
            ctx.setLineDash([8, 8]);
            ctx.lineWidth = isHighlighted ? 4 : 2;
            ctx.strokeStyle = isDimmed ? 'rgba(156, 163, 175, 0.3)' : track.color;
        } else {
            ctx.setLineDash([]);
            ctx.lineWidth = isHighlighted ? 6 : 4;
            ctx.strokeStyle = track.color;
            if (isDimmed) {
                ctx.globalAlpha = 0.2;
                ctx.strokeStyle = '#9ca3af';
            } else if (isHighlighted) {
                ctx.shadowColor = track.color;
                ctx.shadowBlur = 12;
            }
        }

        ctx.beginPath();
        if (track.type === 'point') {
            ctx.arc(track.points[0].x, track.points[0].y, isHighlighted ? 12 : 8, 0, Math.PI * 2);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fill();
        } else {
            ctx.moveTo(track.points[0].x, track.points[0].y);
            if (track.type === 'line') ctx.lineTo(track.points[1].x, track.points[1].y);
            else for (let i = 1; i < track.points.length; i++) ctx.lineTo(track.points[i].x, track.points[i].y);
            ctx.stroke();
        }

        if (track.type !== 'transit') {
            let startX = track.points[0].x;
            let startY = track.points[0].y;
            
            ctx.beginPath();
            ctx.arc(startX, startY, 12, 0, Math.PI * 2);
            ctx.fillStyle = isDimmed ? '#e5e7eb' : track.color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(index + 1, startX, startY + 1);
        }

        if (isHighlighted && progress >= 0 && progress <= 1) {
            let dotX, dotY;
            if (track.type === 'point') {
                dotX = track.points[0].x; dotY = track.points[0].y;
            } else {
                let pts = track.points;
                let exactIndex = progress * (pts.length - 1);
                let idx = Math.floor(exactIndex);
                let nextIdx = Math.min(idx + 1, pts.length - 1);
                let t = exactIndex - idx;
                dotX = pts[idx].x + (pts[nextIdx].x - pts[idx].x) * t;
                dotY = pts[idx].y + (pts[nextIdx].y - pts[idx].y) * t;
            }

            ctx.beginPath();
            ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "#ffffff";
            ctx.shadowBlur = 15;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
            ctx.fillStyle = track.color;
            ctx.shadowBlur = 0;
            ctx.fill();
        }

        if (track.skills && track.skills.length > 0 && track.type !== 'transit') {
            const connector = track.connectionType === 'direct' ? ' + ' : ' , ';
            const skillText = track.skills.map(s => s.nameZh[0]).join(connector);
            let midX, midY, angle = 0;

            if (track.type === 'point') {
                midX = track.points[0].x; midY = track.points[0].y - 20; 
            } else if (track.type === 'line') {
                midX = (track.points[0].x + track.points[1].x) / 2;
                midY = (track.points[0].y + track.points[1].y) / 2;
                angle = Math.atan2(track.points[1].y - track.points[0].y, track.points[1].x - track.points[0].x);
                if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;
            } else if (track.type === 'curve') {
                let midIndex = Math.floor(track.points.length / 2);
                midX = track.points[midIndex].x; midY = track.points[midIndex].y - 20;
            }

            ctx.translate(midX, midY);
            ctx.rotate(angle);
            ctx.font = isHighlighted ? "bold 18px sans-serif" : "bold 15px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineWidth = 4;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
            ctx.strokeText(skillText, 0, -12);
            ctx.fillStyle = isDimmed ? "#9ca3af" : (isHighlighted ? "#1e3a8a" : track.color);
            ctx.fillText(skillText, 0, -12);
        }
        ctx.restore();
    },

    drawTempPath: function() {
        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#3b82f6';
        ctx.setLineDash([8, 8]); 
        
        if (this.currentTool === 'point') {
            ctx.arc(this.tempPath[0].x, this.tempPath[0].y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#3b82f6';
            ctx.fill();
        } else {
            ctx.moveTo(this.tempPath[0].x, this.tempPath[0].y);
            if (this.currentTool === 'line' && this.tempPath.length === 2) {
                ctx.lineTo(this.tempPath[1].x, this.tempPath[1].y);
            } else {
                for (let i = 1; i < this.tempPath.length; i++) ctx.lineTo(this.tempPath[i].x, this.tempPath[i].y);
            }
            ctx.stroke();
        }
        ctx.restore();
    },

    playHighlightAnimation: function(callback, fallTrackIds) { 
        // 1. 终极安全转换：确保 fallTrackIds 绝对是一个数组，就算前端传 null/undefined 也不会报错
        const safeFallIds = Array.isArray(fallTrackIds) ? fallTrackIds : [];
        
        if (this.tracks.length === 0) {
            if(callback) callback();
            return;
        }
        
        this.showcaseMarks = []; 
        let currentIndex = 0;
        const _this = this;
        const duration = 1200;
        let markAddedForCurrent = false; 

        function animateTrack(startTime) {
            let now = Date.now();
            let progress = (now - startTime) / duration;
            if (progress > 1) progress = 1;

            _this.redraw(currentIndex, progress); 

            // 2. 当这条线跑完的瞬间，打上标记 (加入 try-catch 拦截任何潜在报错)
            if (progress === 1 && !markAddedForCurrent) {
                try {
                    let track = _this.tracks[currentIndex];
                    // 确保 track 存在，且是 line 类型，且包含有效技能
                    if (track && track.type === 'line' && track.skills && track.skills.length > 0) {
                        let isFall = safeFallIds.includes(track.id);
                        
                        // 安全获取最后一个点的位置
                        let lastPt = null;
                        if (track.points && track.points.length > 0) {
                            lastPt = track.points[track.points.length - 1];
                        } 
                        
                        // 只有明确拿到了坐标点，才去推送符号，防止 undefined.x 报错
                        if (lastPt && lastPt.x !== undefined && lastPt.y !== undefined) {
                            _this.showcaseMarks.push({ 
                                x: lastPt.x + 15, 
                                y: lastPt.y - 15, 
                                type: isFall ? 'fall' : 'pass' 
                            });
                        }
                    }
                } catch(e) {
                    console.error("⚠️ 符号渲染已被安全拦截，未影响主流程:", e);
                }
                
                markAddedForCurrent = true;
            }

            // 3. 动画流转控制
            if (progress < 1) {
                requestAnimationFrame(() => animateTrack(startTime));
            } else {
                currentIndex++;
                markAddedForCurrent = false;
                if (currentIndex < _this.tracks.length) {
                    setTimeout(() => requestAnimationFrame(() => animateTrack(Date.now())), 300);
                } else {
                    _this.redraw(-1, -1);
                    if (callback) callback();
                }
            }
        }
        requestAnimationFrame(() => animateTrack(Date.now()));
    }
};

window.addEventListener('DOMContentLoaded', () => setTimeout(() => canvasManager.init(), 150));

window.setTool = function(tool) {
    canvasManager.setTool(tool);
    // 【修改点】在这里把 'move' 也注册进去，才能响应按钮的高亮激活状态
    ['line', 'curve', 'point', 'transit', 'move'].forEach(t => {
        const btn = document.getElementById(`tool-${t}`);
        if(btn) btn.className = (t === tool) ? 
            "px-4 py-2 rounded-lg text-sm font-bold bg-blue-500 text-white shadow transition-colors" : 
            "px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors bg-gray-100";
    });
};
window.clearCanvas = function() { canvasManager.clearAll(); };