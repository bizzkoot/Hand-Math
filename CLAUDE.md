# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 3D Hand Math Visualization application built with Three.js for interactive hand-based arithmetic. Users control virtual hand models where the left hand represents tens (0-90) and the right hand represents ones (0-9), allowing visualization of numbers up to 99.

## Development Commands

### Starting the Development Server
```bash
npm start                # Preferred - uses http-server on port 8080
npm run dev             # Alternative with CORS enabled
npm run serve           # Python 3 server alternative
npm run serve-alt       # Python 2 server fallback
```

### Testing
```bash
npx playwright test                    # Run all Playwright tests
npx playwright test --headed          # Run tests with visible browser
npx playwright show-report           # View HTML test report
npx playwright test --debug          # Debug tests interactively
```

### Production Build
```bash
npm run build          # Outputs confirmation (static files ready)
```

## Architecture

### Core Classes and Files

**Main Application (`js/main.js`)**
- `HandMathApp` class - Main application controller
- Manages Three.js scene, camera, renderer, and lighting
- Orchestrates hand model loading and UI initialization
- Contains scene setup methods: `setupScene()`, `setupCamera()`, `setupRenderer()`, `setupLighting()`

**Hand Controller (`js/handController.js`)**  
- `HandController` class - Manages 3D hand animations
- Controls finger positions and smooth transitions
- Handles mathematical calculations (left hand × 10 + right hand)
- Contains animation properties and finger bend angles for realistic movement

**Hand Geometry (`js/realisticHandGeometry.js`)**
- Creates placeholder hand geometry using Three.js primitives
- Defines hand structure with palm, fingers, and joints
- Designed to be replaced with realistic 3D models (GLTF/GLB format)

### Key Dependencies
- **Three.js v0.158.0** - 3D graphics engine
- **OrbitControls** - Camera movement controls  
- **BufferGeometryUtils** - Geometry manipulation utilities
- **Playwright** - End-to-end testing framework
- **http-server** - Development server

### Scene Architecture
- Left hand positioned at (-2, 0, 0) representing tens
- Right hand positioned at (2, 0, 0) representing ones  
- Ambient and directional lighting with shadows
- OrbitControls for 3D scene navigation

### Testing Strategy
Tests are located in `tests/hand-math.spec.js` and cover:
- Scene initialization and WebGL context
- Hand model loading and display
- Finger controls and mathematical calculations
- UI interactions and preset buttons
- Console error detection and diagnostics

## Common Issues and Solutions

### WebGL Context Issues
The application requires WebGL support. Tests verify WebGL context creation and provide diagnostics for failures.

### Hand Model Loading
Currently uses placeholder geometry created with Three.js primitives. The architecture supports loading realistic GLTF/GLB models by replacing the `createPlaceholderHands()` method.

### Animation Performance  
Hand animations use smooth interpolation with configurable `animationSpeed` (0.01-1.0 range) in the HandController class.

## File Structure Notes

- Static assets served from root directory
- Three.js loaded from CDN with fallback error handling
- CSS uses CSS Grid and Flexbox for responsive design
- Hand controls use data attributes for finger/hand identification

## Browser Requirements

Modern browsers with WebGL support (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+).