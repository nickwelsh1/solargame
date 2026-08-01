import { isMobile } from '../utils/helpers.js';

export class Dialogue {
    constructor(game) {
        this.name = 'dialogue';
        this.game = game;

        // Set text styles
        this.fontSize = 30;
        this.textColor = 'hsl(57, 100%, 83%)';

        // Calculate text position for centering
        this.textWidth = game.ctx.measureText(game.ui.dialogueText).width;
        this.textHeight = this.fontSize; // Extract font size
        this.x = game.camera.width / 2;
        this.y = game.camera.height / 2;

        // Calculate rectangle dimensions
        this.rectWidth = game.camera.width * (isMobile() ? 0.9 : 0.5); // textWidth + 20;
        this.rectHeight = game.camera.height * 0.3; // textHeight + 20;
        this.rectX = this.x - this.rectWidth / 2;
        this.rectY = this.y - this.rectHeight / 2;

        this.btnDelay = 300;
    }

    draw() {
        // draw the dialogue and text
        if (
            this.game.state.game_over === false &&
            this.game.ui.dialogueText.length < 1
        ) {
            return;
        }
        this.game.ctx.font = `bold ${this.fontSize}px sans-serif`;
        this.game.ctx.textAlign = 'center';
        this.game.ctx.textBaseline = 'middle';

        // Draw the rectangle
        // ctx.fillStyle = 'skyblue'; // Or any color you prefer
        // ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

        this.drawRoundedRectangle(
            this.rectX,
            this.rectY,
            this.rectWidth,
            this.rectHeight,
        );

        this.drawText(
            this.x,
            this.game.camera.height * 0.45,
            this.game.ui.dialogueText,
        );
    }

    // would be easier
    drawRoundedRectangle(rectX, rectY, rectWidth, rectHeight) {
        // Draw rounded rectangle
        const radius = 10; // Adjust the radius as needed
        this.game.ctx.strokeStyle = this.textColor; // Or any color you prefer
        this.game.ctx.lineWidth = 2; // Adjust the stroke width as needed
        this.game.ctx.beginPath();
        this.game.ctx.moveTo(rectX + radius, rectY);
        this.game.ctx.lineTo(rectX + rectWidth - radius, rectY);
        this.game.ctx.arc(
            rectX + rectWidth - radius,
            rectY + radius,
            radius,
            (Math.PI * 3) / 2,
            Math.PI * 2,
        );
        this.game.ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
        this.game.ctx.arc(
            rectX + rectWidth - radius,
            rectY + rectHeight - radius,
            radius,
            0,
            Math.PI / 2,
        );
        this.game.ctx.lineTo(rectX + radius, rectY + rectHeight);
        this.game.ctx.arc(
            rectX + radius,
            rectY + rectHeight - radius,
            radius,
            Math.PI / 2,
            Math.PI,
        );
        this.game.ctx.lineTo(rectX, rectY + radius);
        this.game.ctx.arc(
            rectX + radius,
            rectY + radius,
            radius,
            Math.PI,
            (Math.PI * 3) / 2,
        );
        this.game.ctx.closePath();
        this.game.ctx.stroke();
    }

    drawText(x, y, text) {
        // Draw the text
        this.game.ctx.fillStyle = this.textColor; // Or any color you prefer
        this.game.ctx.fillText(text, x, y);
    }

    update(deltaTime) {
        if (
            this.game.state.game_over === false &&
            this.game.ui.dialogueText.length < 1
        ) {
            return;
        }
        // message.innerText = (deltaTime + "").substring(0, 2);
        // Check if it's time to draw the rectangle
        this.btnDelay -= deltaTime;
        if (this.btnDelay <= 0) {
            // Draw the rectangle
            // ctx.fillStyle = 'blue';
            this.drawRoundedRectangle(
                this.rectX * 1.5,
                this.rectY * 1.5,
                this.rectWidth * 0.5,
                this.rectHeight * 0.3,
            );
            this.drawText(
                this.x,
                this.y + this.game.camera.height * 0.07,
                'restart',
            );
            // ctx.fillRect(this.rectX, this.rectY, this.rectWidth, this.rectHeight);
            this.btnDelay = 0; // Reset the delay
        }
    }
}
