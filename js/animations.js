// ===== ANİMASYON SİSTEMİ =====

class AnimationManager {
    constructor() {
        this.animations = new Map();
        this.requestId = null;
        this.lastTime = 0;
        this.running = false;
    }
    
    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.animate();
    }
    
    stop() {
        this.running = false;
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }
    }
    
    addAnimation(name, animation) {
        this.animations.set(name, animation);
        if (!this.running) this.start();
    }
    
    removeAnimation(name) {
        this.animations.delete(name);
        if (this.animations.size === 0) this.stop();
    }
    
    getAnimation(name) {
        return this.animations.get(name);
    }
    
    clearAll() {
        this.animations.clear();
        this.stop();
    }
    
    animate() {
        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        for (const [name, animation] of this.animations) {
            if (animation.update(deltaTime)) {
                this.animations.delete(name);
            }
        }
        
        if (this.animations.size > 0) {
            this.requestId = requestAnimationFrame(() => this.animate());
        } else {
            this.running = false;
        }
    }
}

// ===== Temel Animasyon Sınıfı =====
class Animation {
    constructor(target, duration, onUpdate, onComplete) {
        this.target = target;
        this.duration = duration;
        this.onUpdate = onUpdate || (() => {});
        this.onComplete = onComplete || (() => {});
        this.startTime = 0;
        this.elapsed = 0;
        this.completed = false;
    }
    
    start() {
        this.startTime = performance.now();
        this.elapsed = 0;
        this.completed = false;
    }
    
    update(deltaTime) {
        this.elapsed += deltaTime;
        const progress = Math.min(this.elapsed / this.duration, 1);
        
        if (this.target) {
            this.onUpdate(progress, this.elapsed, deltaTime);
        } else {
            this.onUpdate(progress, this.elapsed, deltaTime);
        }
        
        if (this.elapsed >= this.duration) {
            this.onComplete();
            this.completed = true;
            return true;
        }
        return false;
    }
    
    stop() {
        this.completed = true;
    }
}

// ===== Fade Animasyonu =====
class FadeAnimation extends Animation {
    constructor(element, duration, from, to, onComplete) {
        super(element, duration, null, onComplete);
        this.from = from;
        this.to = to;
        this.initialOpacity = element.style.opacity;
    }
    
    start() {
        super.start();
        this.element.style.opacity = this.from;
        this.element.style.display = 'block';
    }
    
    update(deltaTime) {
        const progress = this.elapsed / this.duration;
        const currentOpacity = this.from + (this.to - this.from) * progress;
        this.element.style.opacity = currentOpacity;
        
        if (this.elapsed >= this.duration) {
            this.element.style.opacity = this.to;
            if (this.to === 0) {
                this.element.style.display = 'none';
            }
            this.onComplete();
            return true;
        }
        return false;
    }
}

// ===== Slide Animasyonu =====
class SlideAnimation extends Animation {
    constructor(element, duration, direction, distance, onComplete) {
        super(element, duration, null, onComplete);
        this.direction = direction; // 'up', 'down', 'left', 'right'
        this.distance = distance;
        this.initialTransform = element.style.transform;
    }
    
    start() {
        super.start();
        const directions = {
            up: `translateY(${this.distance}px)`,
            down: `translateY(-${this.distance}px)`,
            left: `translateX(${this.distance}px)`,
            right: `translateX(-${this.distance}px)`
        };
        this.element.style.transform = directions[this.direction];
        this.element.style.opacity = '0';
        this.element.style.display = 'block';
    }
    
    update(deltaTime) {
        const progress = this.elapsed / this.duration;
        const currentDistance = this.distance * (1 - progress);
        
        const directions = {
            up: `translateY(${currentDistance}px)`,
            down: `translateY(-${currentDistance}px)`,
            left: `translateX(${currentDistance}px)`,
            right: `translateX(-${currentDistance}px)`
        };
        
        this.element.style.transform = directions[this.direction];
        this.element.style.opacity = progress;
        
        if (this.elapsed >= this.duration) {
            this.element.style.transform = 'translate(0, 0)';
            this.element.style.opacity = '1';
            this.onComplete();
            return true;
        }
        return false;
    }
}

// ===== Scale Animasyonu =====
class ScaleAnimation extends Animation {
    constructor(element, duration, from, to, onComplete) {
        super(element, duration, null, onComplete);
        this.from = from;
        this.to = to;
        this.initialTransform = element.style.transform;
    }
    
    start() {
        super.start();
        this.element.style.transform = `scale(${this.from})`;
        this.element.style.display = 'block';
    }
    
    update(deltaTime) {
        const progress = this.elapsed / this.duration;
        const currentScale = this.from + (this.to - this.from) * progress;
        this.element.style.transform = `scale(${currentScale})`;
        
        if (this.elapsed >= this.duration) {
            this.element.style.transform = `scale(${this.to})`;
            this.onComplete();
            return true;
        }
        return false;
    }
}

// ===== Rotate Animasyonu =====
class RotateAnimation extends Animation {
    constructor(element, duration, from, to, onComplete) {
        super(element, duration, null, onComplete);
        this.from = from;
        this.to = to;
    }
    
    start() {
        super.start();
        this.element.style.transform = `rotate(${this.from}deg)`;
    }
    
    update(deltaTime) {
        const progress = this.elapsed / this.duration;
        const currentRotation = this.from + (this.to - this.from) * progress;
        this.element.style.transform = `rotate(${currentRotation}deg)`;
        
        if (this.elapsed >= this.duration) {
            this.element.style.transform = `rotate(${this.to}deg)`;
            this.onComplete();
            return true;
        }
        return false;
    }
}

// ===== Color Animasyonu =====
class ColorAnimation extends Animation {
    constructor(element, duration, from, to, property = 'color', onComplete) {
        super(element, duration, null, onComplete);
        this.from = from;
        this.to = to;
        this.property = property;
        this.initialColor = element.style[property];
    }
    
    start() {
        super.start();
        this.element.style[this.property] = this.from;
    }
    
    update(deltaTime) {
        const progress = this.elapsed / this.duration;
        const currentColor = this.interpolateColor(this.from, this.to, progress);
        this.element.style[this.property] = currentColor;
        
        if (this.elapsed >= this.duration) {
            this.element.style[this.property] = this.to;
            this.onComplete();
            return true;
        }
        return false;
    }
    
    interpolateColor(color1, color2, factor) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        
        const r = Math.round(c1.r + (c2.r - c1.r) * factor);
        const g = Math.round(c1.g + (c2.g - c1.g) * factor);
        const b = Math.round(c1.b + (c2.b - c1.b) * factor);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
}

// ===== Bounce Animasyonu =====
class BounceAnimation extends Animation {
    constructor(element, duration, height = 50, onComplete) {
        super(element, duration, null, onComplete);
        this.height = height;
        this.initialTransform = element.style.transform;
    }
    
    start() {
        super.start();
        this.element.style.transform = this.initialTransform || '';
    }
    
    update(deltaTime) {
        const progress = this.elapsed / this.duration;
        
        // Bounce fonksiyonu
        let bounce;
        if (progress < 0.2) {
            bounce = 5 * progress;
        } else if (progress < 0.4) {
            bounce = 5 * (0.4 - progress) + 1;
        } else if (progress < 0.6) {
            bounce = 5 * (progress - 0.4) + 1;
        } else if (progress < 0.8) {
            bounce = 5 * (0.8 - progress) + 1;
        } else {
            bounce = 5 * (progress - 0.8) + 1;
        }
        
        const currentHeight = this.height * bounce;
        this.element.style.transform = `translateY(-${currentHeight}px) ${this.initialTransform || ''}`;
        
        if (this.elapsed >= this.duration) {
            this.element.style.transform = this.initialTransform || '';
            this.onComplete();
            return true;
        }
        return false;
    }
}

// ===== Shake Animasyonu =====
class ShakeAnimation extends Animation {
    constructor(element, duration, intensity = 10, onComplete) {
        super(element, duration, null, onComplete);
        this.intensity = intensity;
        this.initialTransform = element.style.transform;
    }
    
    start() {
        super.start();
        this.element.style.transform = this.initialTransform || '';
    }
    
    update(deltaTime) {
        const progress = this.elapsed / this.duration;
        const decay = 1 - progress;
        
        const x = (Math.random() - 0.5) * 2 * this.intensity * decay;
        const y = (Math.random() - 0.5) * 2 * this.intensity * decay;
        
        this.element.style.transform = `translate(${x}px, ${y}px) ${this.initialTransform || ''}`;
        
        if (this.elapsed >= this.duration) {
            this.element.style.transform = this.initialTransform || '';
            this.onComplete();
            return true;
        }
        return false;
    }
}

// ===== Pulse Animasyonu =====
class PulseAnimation extends Animation {
    constructor(element, duration, minScale = 1, maxScale = 1.05, onComplete) {
        super(element, duration, null, onComplete);
        this.minScale = minScale;
        this.maxScale = maxScale;
        this.range = maxScale - minScale;
        this.initialTransform = element.style.transform;
    }
    
    start() {
        super.start();
        this.element.style.transform = `${this.initialTransform || ''} scale(${this.minScale})`;
    }
    
    update(deltaTime) {
        const progress = (this.elapsed / this.duration) % 1;
        const scale = this.minScale + this.range * Math.abs(Math.sin(progress * Math.PI * 2));
        
        this.element.style.transform = `${this.initialTransform || ''} scale(${scale})`;
        
        if (this.elapsed >= this.duration) {
            this.onComplete();
            return true;
        }
        return false;
    }
}

// ===== Glitch Efekti =====
class GlitchAnimation extends Animation {
    constructor(element, duration, intensity = 5, onComplete) {
        super(element, duration, null, onComplete);
        this.intensity = intensity;
        this.initialTransform = element.style.transform;
        this.initialPosition = element.style.position;
    }
    
    start() {
        super.start();
        this.element.style.position = 'relative';
    }
    
    update(deltaTime) {
        const progress = this.elapsed / this.duration;
        
        if (Math.random() < 0.1) {
            const x = (Math.random() - 0.5) * this.intensity * 2;
            const y = (Math.random() - 0.5) * this.intensity * 2;
            this.element.style.transform = `translate(${x}px, ${y}px) ${this.initialTransform || ''}`;
        } else {
            this.element.style.transform = this.initialTransform || '';
        }
        
        // RGB Split efekti
        if (Math.random() < 0.05) {
            this.element.style.color = `rgb(
                ${Math.floor(Math.random() * 255)},
                ${Math.floor(Math.random() * 255)},
                ${Math.floor(Math.random() * 255)}
            )`;
            this.element.style.textShadow = `
                ${Math.random() > 0.5 ? '2px' : '-2px'} 0 0 rgba(255,0,0,0.8),
                ${Math.random() > 0.5 ? '-2px' : '2px'} 0 0 rgba(0,255,0,0.8),
                0 ${Math.random() > 0.5 ? '2px' : '-2px'} 0 rgba(0,0,255,0.8)
            `;
        } else {
            this.element.style.color = '';
            this.element.style.textShadow = '';
        }
        
        if (this.elapsed >= this.duration) {
            this.element.style.transform = this.initialTransform || '';
            this.element.style.color = '';
            this.element.style.textShadow = '';
            this.element.style.position = this.initialPosition;
            this.onComplete();
            return true;
        }
        return false;
    }
}

// ===== Crewmate Animasyonları =====
class CrewmateAnimation {
    constructor(crewmate, duration, animationType, onComplete) {
        this.crewmate = crewmate;
        this.duration = duration;
        this.animationType = animationType;
        this.onComplete = onComplete || (() => {});
        this.startTime = 0;
        this.elapsed = 0;
    }
    
    start() {
        this.startTime = performance.now();
        this.elapsed = 0;
    }
    
    update(deltaTime) {
        this.elapsed += deltaTime;
        const progress = Math.min(this.elapsed / this.duration, 1);
        
        switch (this.animationType) {
            case 'walk':
                this.animateWalk(progress);
                break;
            case 'idle':
                this.animateIdle(progress);
                break;
            case 'task':
                this.animateTask(progress);
                break;
            case 'kill':
                this.animateKill(progress);
                break;
            case 'vent':
                this.animateVent(progress);
                break;
            case 'report':
                this.animateReport(progress);
                break;
            case 'emergency':
                this.animateEmergency(progress);
                break;
            default:
                this.animateIdle(progress);
        }
        
        if (this.elapsed >= this.duration) {
            this.onComplete();
            return true;
        }
        return false;
    }
    
    animateWalk(progress) {
        // Yürüme animasyonu - karakterin bacaklarını hareket ettir
        const legCycle = Math.sin(progress * Math.PI * 4);
        const armCycle = Math.sin(progress * Math.PI * 4 + Math.PI);
        
        if (this.crewmate.mesh) {
            // Bacak animasyonu
            if (this.crewmate.mesh.legs) {
                this.crewmate.mesh.legs.rotation.x = legCycle * 0.5;
            }
            // Kol animasyonu
            if (this.crewmate.mesh.arms) {
                this.crewmate.mesh.arms.rotation.x = armCycle * 0.3;
            }
        }
    }
    
    animateIdle(progress) {
        // Boşta durma animasyonu - hafif sallanma
        const sway = Math.sin(progress * Math.PI * 2) * 0.05;
        if (this.crewmate.mesh) {
            this.crewmate.mesh.rotation.z = sway;
        }
    }
    
    animateTask(progress) {
        // Görev yapma animasyonu
        if (this.crewmate.mesh) {
            // Karakter eğilir
            this.crewmate.mesh.rotation.x = Math.sin(progress * Math.PI) * 0.3;
        }
    }
    
    animateKill(progress) {
        // Öldürme animasyonu
        if (progress < 0.3) {
            // Hazırlanma
            if (this.crewmate.mesh) {
                this.crewmate.mesh.scale.set(1.1, 1.1, 1.1);
            }
        } else if (progress < 0.6) {
            // Saldırmak
            if (this.crewmate.mesh) {
                this.crewmate.mesh.scale.set(1.3, 0.8, 1.3);
            }
        } else {
            // Geri dönme
            if (this.crewmate.mesh) {
                const scale = 1.3 - (progress - 0.6) * 1.3 / 0.4;
                this.crewmate.mesh.scale.set(scale, scale, scale);
            }
        }
    }
    
    animateVent(progress) {
        // Havalandırma animasyonu
        if (progress < 0.5) {
            // Küçülme
            const scale = 1 - progress * 2 * 0.5;
            if (this.crewmate.mesh) {
                this.crewmate.mesh.scale.set(scale, scale, scale);
            }
        } else {
            // Büyüme
            const scale = (progress - 0.5) * 2 * 0.5;
            if (this.crewmate.mesh) {
                this.crewmate.mesh.scale.set(scale, scale, scale);
            }
        }
    }
    
    animateReport(progress) {
        // Ceset bildirme animasyonu
        if (this.crewmate.mesh) {
            // Karakter aşağıya bakar
            this.crewmate.mesh.rotation.x = Math.sin(progress * Math.PI * 2) * 0.5;
        }
    }
    
    animateEmergency(progress) {
        // Acil durum butonuna basma animasyonu
        if (this.crewmate.mesh) {
            // Karakter yukarıya bakar ve kolunu kaldırır
            this.crewmate.mesh.rotation.x = -0.3;
            if (this.crewmate.mesh.arms) {
                this.crewmate.mesh.arms.rotation.x = -0.5;
            }
        }
    }
}

// ===== Global Animation Manager =====
const animationManager = new AnimationManager();

// ===== Animasyon Yardımcı Fonksiyonları =====
function fadeIn(element, duration = 300, onComplete) {
    const anim = new FadeAnimation(element, duration, 0, 1, onComplete);
    animationManager.addAnimation(`fadeIn_${Date.now()}`, anim);
    anim.start();
    return anim;
}

function fadeOut(element, duration = 300, onComplete) {
    const anim = new FadeAnimation(element, duration, 1, 0, onComplete);
    animationManager.addAnimation(`fadeOut_${Date.now()}`, anim);
    anim.start();
    return anim;
}

function slideIn(element, direction = 'up', duration = 300, distance = 50, onComplete) {
    const anim = new SlideAnimation(element, duration, direction, distance, onComplete);
    animationManager.addAnimation(`slideIn_${Date.now()}`, anim);
    anim.start();
    return anim;
}

function slideOut(element, direction = 'down', duration = 300, distance = 50, onComplete) {
    const anim = new SlideAnimation(element, duration, direction, distance, onComplete);
    animationManager.addAnimation(`slideOut_${Date.now()}`, anim);
    anim.start();
    return anim;
}

function scaleIn(element, duration = 300, from = 0.8, to = 1, onComplete) {
    const anim = new ScaleAnimation(element, duration, from, to, onComplete);
    animationManager.addAnimation(`scaleIn_${Date.now()}`, anim);
    anim.start();
    return anim;
}

function shakeElement(element, duration = 500, intensity = 10, onComplete) {
    const anim = new ShakeAnimation(element, duration, intensity, onComplete);
    animationManager.addAnimation(`shake_${Date.now()}`, anim);
    anim.start();
    return anim;
}

function pulseElement(element, duration = 1000, minScale = 1, maxScale = 1.05, onComplete) {
    const anim = new PulseAnimation(element, duration, minScale, maxScale, onComplete);
    animationManager.addAnimation(`pulse_${Date.now()}`, anim);
    anim.start();
    return anim;
}

function bounceElement(element, duration = 500, height = 50, onComplete) {
    const anim = new BounceAnimation(element, duration, height, onComplete);
    animationManager.addAnimation(`bounce_${Date.now()}`, anim);
    anim.start();
    return anim;
}

function glitchElement(element, duration = 500, intensity = 5, onComplete) {
    const anim = new GlitchAnimation(element, duration, intensity, onComplete);
    animationManager.addAnimation(`glitch_${Date.now()}`, anim);
    anim.start();
    return anim;
}

// ===== Özel Animasyonlar =====
function animateCrewmateWalk(crewmate, duration) {
    const anim = new CrewmateAnimation(crewmate, duration, 'walk');
    animationManager.addAnimation(`crewmateWalk_${Date.now()}`, anim);
    anim.start();
    return anim;
}

function animateCrewmateIdle(crewmate, duration) {
    const anim = new CrewmateAnimation(crewmate, duration, 'idle');
    animationManager.addAnimation(`crewmateIdle_${Date.now()}`, anim);
    anim.start();
    return anim;
}

function animateCrewmateTask(crewmate, duration) {
    const anim = new CrewmateAnimation(crewmate, duration, 'task');
    animationManager.addAnimation(`crewmateTask_${Date.now()}`, anim);
    anim.start();
    return anim;
}

function animateKill(crewmate, duration) {
    const anim = new CrewmateAnimation(crewmate, duration, 'kill');
    animationManager.addAnimation(`kill_${Date.now()}`, anim);
    anim.start();
    return anim;
}

// ===== CSS Animasyonları =====
function addCSSAnimation(element, animationName, duration = '1s', delay = '0s', iterationCount = '1', fillMode = 'forwards') {
    element.style.animation = `${animationName} ${duration} ${delay} ${iterationCount} forwards`;
    element.style.animationFillMode = fillMode;
}

function removeCSSAnimation(element) {
    element.style.animation = '';
    element.style.animationFillMode = '';
}

// ===== Parçacık Sistemi =====
class Particle {
    constructor(x, y, color, size, velocity, lifetime) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.velocity = velocity;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.gravity = 0.1;
    }
    
    update(deltaTime) {
        this.lifetime -= deltaTime;
        this.velocity.y += this.gravity * deltaTime * 100;
        this.x += this.velocity.x * deltaTime * 100;
        this.y += this.velocity.y * deltaTime * 100;
        
        // Yaşam süresine göre boyut ve saydamlık
        const progress = this.lifetime / this.maxLifetime;
        this.size = this.size * progress;
        this.alpha = progress;
        
        return this.lifetime <= 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 100;
    }
    
    addParticle(particle) {
        if (this.particles.length < this.maxParticles) {
            this.particles.push(particle);
        }
    }
    
    createExplosion(x, y, color, count = 20, maxSize = 5, maxVelocity = 2) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = {
                x: Math.cos(angle) * (Math.random() * maxVelocity),
                y: Math.sin(angle) * (Math.random() * maxVelocity) - Math.random() * 0.5
            };
            const size = Math.random() * maxSize;
            const lifetime = 0.5 + Math.random() * 0.5;
            
            const particle = new Particle(x, y, color, size, velocity, lifetime);
            this.addParticle(particle);
        }
    }
    
    createBloodSplatter(x, y, count = 15) {
        const colors = ['#8b0000', '#a00000', '#660000', '#4d0000'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = {
                x: Math.cos(angle) * (Math.random() * 3 + 1),
                y: Math.sin(angle) * (Math.random() * 3 + 1) - Math.random() * 2
            };
            const size = Math.random() * 3 + 1;
            const lifetime = 0.8 + Math.random() * 0.4;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const particle = new Particle(x, y, color, size, velocity, lifetime);
            this.addParticle(particle);
        }
    }
    
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (this.particles[i].update(deltaTime)) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        for (const particle of this.particles) {
            particle.draw(ctx);
        }
    }
    
    clear() {
        this.particles = [];
    }
}

// Global parçacık sistemi
const particleSystem = new ParticleSystem();

// ===== Canvas Animasyon Yöneticisi =====
class CanvasAnimationManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.animations = [];
        this.running = false;
        this.lastTime = 0;
    }
    
    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.animate();
    }
    
    stop() {
        this.running = false;
    }
    
    addAnimation(animation) {
        this.animations.push(animation);
        if (!this.running) this.start();
    }
    
    removeAnimation(animation) {
        const index = this.animations.indexOf(animation);
        if (index > -1) {
            this.animations.splice(index, 1);
        }
        if (this.animations.length === 0) this.stop();
    }
    
    clearAll() {
        this.animations = [];
        this.stop();
    }
    
    animate() {
        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        // Canvası temizle
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Animasyonları güncelle ve çiz
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const anim = this.animations[i];
            if (anim.update(deltaTime)) {
                this.animations.splice(i, 1);
            }
            if (anim.draw) {
                anim.draw(this.ctx);
            }
        }
        
        // Parçacıkları çiz
        particleSystem.update(deltaTime);
        particleSystem.draw(this.ctx);
        
        if (this.animations.length > 0 || particleSystem.particles.length > 0) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.running = false;
        }
    }
    
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }
}

// ===== Canvas Animasyon Sınıfı =====
class CanvasAnimation {
    constructor(duration, onUpdate, onDraw, onComplete) {
        this.duration = duration;
        this.onUpdate = onUpdate || (() => {});
        this.onDraw = onDraw || (() => {});
        this.onComplete = onComplete || (() => {});
        this.startTime = 0;
        this.elapsed = 0;
        this.completed = false;
    }
    
    start() {
        this.startTime = performance.now();
        this.elapsed = 0;
        this.completed = false;
    }
    
    update(deltaTime) {
        this.elapsed += deltaTime;
        const progress = Math.min(this.elapsed / this.duration, 1);
        
        this.onUpdate(progress, this.elapsed, deltaTime);
        
        if (this.elapsed >= this.duration) {
            this.onComplete();
            this.completed = true;
            return true;
        }
        return false;
    }
    
    draw(ctx) {
        this.onDraw(ctx);
    }
}

// ===== Animasyon Kütüphanesi =====
const Animations = {
    // Temel animasyonlar
    fadeIn,
    fadeOut,
    slideIn,
    slideOut,
    scaleIn,
    shakeElement,
    pulseElement,
    bounceElement,
    glitchElement,
    
    // Crewmate animasyonları
    animateCrewmateWalk,
    animateCrewmateIdle,
    animateCrewmateTask,
    animateKill,
    
    // Parçacık sistemi
    particleSystem,
    
    // Yöneticiler
    animationManager,
    CanvasAnimationManager,
    CanvasAnimation,
    
    // CSS animasyonları
    addCSSAnimation,
    removeCSSAnimation
};
