class CanvasHandRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.handStates = new Map(); // Cache for hand state renders
    }
    
    drawHand(x, y, fingerCount, isLeft = true) {
        const handWidth = 120;
        const handHeight = 150;
        
        // Draw anatomically correct palm
        this.drawPalm(x, y, handWidth, handHeight);
        
        // Draw fingers with proper counting logic
        this.drawFingers(x, y, fingerCount, handWidth, isLeft);
    }
    
    drawPalm(x, y, width, height) {
        const ctx = this.ctx;
        
        // Natural palm gradient
        const palmGradient = ctx.createRadialGradient(
            x + width/2, y + height*0.6, 0,
            x + width/2, y + height*0.6, width/2
        );
        palmGradient.addColorStop(0, '#f8c8a8');
        palmGradient.addColorStop(1, '#f0b898');
        
        ctx.fillStyle = palmGradient;
        ctx.strokeStyle = '#d4a574';
        ctx.lineWidth = 2;
        
        // Anatomically correct palm shape
        ctx.beginPath();
        ctx.ellipse(x + width/2, y + height*0.7, 
                   width/2, height/3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    
    isFingerExtended(fingerIndex, number) {
        // fingerIndex: 0=thumb, 1=index, 2=middle, 3=ring, 4=pinky
        switch (number) {
            case 0: return false;
            case 1: return fingerIndex === 1;
            case 2: return fingerIndex === 1 || fingerIndex === 2;
            case 3: return fingerIndex >= 1 && fingerIndex <= 3;
            case 4: return fingerIndex >= 1 && fingerIndex <= 4;
            case 5: return fingerIndex === 0;
            case 6: return fingerIndex === 0 || fingerIndex === 1;
            case 7: return fingerIndex === 0 || fingerIndex === 1 || fingerIndex === 2;
            case 8: return fingerIndex <= 3;
            case 9: return true;
            default: return false;
        }
    }

    drawFingers(x, y, count, handWidth, isLeft) {
        const fingerPositions = [
            { x: x + 20, y: y + 40, angle: -0.3, name: 'thumb' },  // Thumb
            { x: x + 35, y: y + 10, angle: 0, name: 'index' },     // Index
            { x: x + 55, y: y + 5, angle: 0, name: 'middle' },     // Middle
            { x: x + 75, y: y + 10, angle: 0, name: 'ring' },      // Ring
            { x: x + 95, y: y + 20, angle: 0.1, name: 'pinky' }    // Pinky
        ];
        
        // Mirror positions for left hand
        if (isLeft) {
            fingerPositions.forEach(pos => {
                pos.x = x + handWidth - (pos.x - x);
                pos.angle = -pos.angle;
            });
        }
        
        fingerPositions.forEach((pos, index) => {
            const isExtended = this.isFingerExtended(index, count);
            this.drawRealisticFinger(pos, isExtended);
        });
    }
    
    drawRealisticFinger(position, extended) {
        const ctx = this.ctx;
        const { x, y, angle } = position;
        const width = 18;
        const length = extended ? 60 : 25;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        // Finger gradient for 3D effect
        const fingerGradient = ctx.createLinearGradient(0, 0, 0, length);
        fingerGradient.addColorStop(0, '#f8c8a8');
        fingerGradient.addColorStop(0.5, '#f4c2a1');
        fingerGradient.addColorStop(1, '#f0b898');
        
        ctx.fillStyle = fingerGradient;
        ctx.strokeStyle = '#d4a574';
        ctx.lineWidth = 1.5;
        
        // Draw finger with natural curves
        ctx.beginPath();
        if (extended) {
            // Extended finger - natural shape with slight taper
            ctx.moveTo(-width/2, 0);
            ctx.quadraticCurveTo(-width/2, length/2, -width/3, length);
            ctx.quadraticCurveTo(0, length + 3, width/3, length);
            ctx.quadraticCurveTo(width/2, length/2, width/2, 0);
            ctx.closePath();
        } else {
            // Closed finger - realistic curl
            ctx.ellipse(0, length/2, width/2, length/2, 0, 0, Math.PI * 2);
        }
        
        ctx.fill();
        ctx.stroke();
        
        // Add fingertip highlight for extended fingers
        if (extended) {
            ctx.fillStyle = '#fdd8b8';
            ctx.beginPath();
            ctx.ellipse(0, length, width/3, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    drawBackground() {
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawCalculation(total) {
        this.ctx.fillStyle = '#000';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Total: ${total}`, this.canvas.width / 2, this.canvas.height - 30);
    }
    
    render(leftCount, rightCount) {
        // Clear and setup background
        this.drawBackground();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw both hands
        this.drawHand(50, 50, leftCount, true);   // Left hand (tens)
        this.drawHand(350, 50, rightCount, false); // Right hand (ones)

        // Draw calculation
        this.drawCalculation(leftCount * 10 + rightCount);
    }
}
