# 3D Hand Math Visualization

A modern web application for interactive hand-based arithmetic using Three.js for 3D visualization.

## Features

- **3D Hand Models**: Realistic hand visualization with individual finger control
- **Interactive Controls**: Sliders to control each finger position
- **Mathematical Calculations**: Left hand represents tens (0-90), right hand represents ones (0-9)
- **Preset Values**: Quick buttons for common numbers (0, 5, 10, 25, 50, 99)
- **Modern UI**: Clean, responsive design with smooth animations
- **Camera Controls**: Mouse interaction for 3D scene navigation

## Quick Start

### Option 1: Using Node.js (Recommended)

1. **Install Node.js** (if not already installed)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```
   - Opens automatically at `http://localhost:8080`

### Option 2: Using Python

If you have Python installed, you can use the built-in HTTP server:

```bash
# For Python 3
npm run serve

# For Python 2 (if Python 3 not available)
npm run serve-alt
```

### Option 3: Manual Server Setup

You can use any local web server. The application needs to be served over HTTP (not file://) due to CORS restrictions.

## Project Structure

```
Hand_Math/
├── index.html          # Main HTML file
├── styles/
│   └── main.css        # Styling and responsive design
├── js/
│   ├── main.js         # Main application logic
│   └── handController.js # Hand animation controller
├── assets/             # Future: 3D models and textures
├── package.json        # Project configuration
└── README.md          # This file
```

## How It Works

### Hand Math System
- **Left Hand**: Represents tens (10, 20, 30, etc.)
  - Each raised finger = +10 to the total
- **Right Hand**: Represents ones (1, 2, 3, etc.)
  - Each raised finger = +1 to the total
- **Total Value**: (Left Hand × 10) + Right Hand

### 3D Scene Controls
- **Mouse Drag**: Rotate camera around the scene
- **Mouse Wheel**: Zoom in/out
- **Reset Button**: Return camera to default position
- **Wireframe Button**: Toggle wireframe view

### Finger Controls
- **Sliders**: Control individual finger positions (0 = closed, 1 = open)
- **Real-time Updates**: Values update immediately as you move sliders
- **Smooth Animations**: Fingers move smoothly between positions

## Technical Details

### Technologies Used
- **Three.js**: 3D graphics library
- **Vanilla JavaScript**: No framework dependencies
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **HTML5**: Semantic markup

### Browser Requirements
- Modern browsers with WebGL support
- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+

### Performance Features
- Optimized 3D rendering with shadows and lighting
- Responsive design for all screen sizes
- Efficient animation system
- Resource cleanup for memory management

## Development

### Skin Tone API

You can adjust the skin color of both hands at runtime via a simple public API exposed on the global app instance.

- Initialize the app as usual (load the page so `handMathApp` is created)
- In the browser console (or your code), call:

```js
// Valid hex formats: #RGB or #RRGGBB
handMathApp.setSkinColor('#c79a6b');
```

Notes:
- Invalid values are safely ignored and return `false`.
- The service caches unique materials for both hands to update efficiently.
- On load, the default color is captured from existing materials.

### Adding Real Hand Models

To replace the placeholder hand geometry with realistic models:

1. Export hand models in GLTF/GLB format
2. Place models in `assets/` directory
3. Update `main.js` to load actual models:
   ```javascript
   // Replace createPlaceholderHands() with:
   const loader = new THREE.GLTFLoader();
   const leftHandModel = await loader.loadAsync('assets/left-hand.glb');
   const rightHandModel = await loader.loadAsync('assets/right-hand.glb');
   ```

### Customization

#### Colors and Styling
- Modify CSS variables in `styles/main.css`
- Update the `:root` section for color schemes

#### Hand Positioning
- Adjust hand positions in `main.js`:
  ```javascript
  this.leftHand.position.set(-2, 0, 0);  // X, Y, Z coordinates
  this.rightHand.position.set(2, 0, 0);
  ```

#### Animation Speed
- Modify `animationSpeed` in `handController.js`
- Range: 0.01 (slow) to 1.0 (instant)

## Future Enhancements

### Planned Features
- [ ] Realistic hand models with proper textures
- [ ] Sound effects for finger movements
- [ ] Mathematical operation modes (addition, subtraction)
- [ ] Hand gesture recognition via webcam
- [ ] Educational tutorials and guided lessons
- [ ] Different cultural counting systems
- [ ] Export/import hand positions
- [ ] Virtual reality (VR) support

### Model Integration
- [ ] Rigged hand models with proper bone structure
- [ ] Blend shapes for natural finger poses
- [ ] Skin textures and materials
- [ ] Nail and joint details

## Troubleshooting

### Common Issues

**3D scene not loading:**
- Check browser console for errors
- Ensure you're running from a local server (not file://)
- Verify WebGL support: visit `webglreport.com`

**Slider controls not working:**
- Check that JavaScript is enabled
- Refresh the page to reset the application state

**Performance issues:**
- Try disabling shadows in `main.js`
- Reduce shadow map resolution
- Close other browser tabs

### Browser Compatibility
If you encounter issues, try:
1. Updating your browser to the latest version
2. Enabling hardware acceleration
3. Clearing browser cache and cookies

## License

This project is licensed under the MIT License - see the package.json file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

For questions or suggestions, please open an issue in the repository.
