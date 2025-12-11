# Implementation Plan

- [x] 1. Set up project structure and testing framework



  - [x] 1.1 Create modular directory structure under pano-viewer/src

    - Create directories: core/, managers/, utils/, ui/
    - Set up ES module exports
    - _Requirements: 3.1, 3.2_

  - [x] 1.2 Set up Vitest and fast-check testing framework

    - Install vitest and fast-check dependencies
    - Create vitest.config.js
    - Create test directory structure
    - _Requirements: Testing Strategy_

  - [x] 1.3 Write unit tests for existing utility modules

    - Test MobileDetector device detection
    - Test PerformanceMonitor FPS calculation
    - _Requirements: 6.1, 8.1_



- [x] 2. Implement EventBus for module communication
  - [x] 2.1 Create EventBus class with on/off/emit/once methods
    - Implement event subscription and publishing
    - Support wildcard events
    - _Requirements: 3.3_

  - [x] 2.2 Write unit tests for EventBus
    - Test subscription and emission
    - Test once() behavior
    - Test off() unsubscription
    - _Requirements: 3.3_

- [x] 3. Enhance ImageLoader with progressive loading



  - [x] 3.1 Implement thumbnail generation

    - Create canvas-based thumbnail generator
    - Support configurable thumbnail size
    - _Requirements: 1.1_
  - [x] 3.2 Implement progressive loading with callbacks

    - Load thumbnail first, then full image
    - Provide progress callbacks during loading
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 3.3 Write property test for progressive loading order

    - **Property 1: Progressive Loading Order**
    - **Validates: Requirements 1.1, 1.2, 1.4**

  - [ ] 3.4 Write unit tests for ImageLoader
    - Test cache hit/miss behavior
    - Test error handling for invalid URLs
    - _Requirements: 1.5_


- [-] 4. Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement HistoryManager with full undo/redo support
  - [x] 5.1 Enhance HistoryManager execute/undo/redo methods

    - Implement proper state restoration
    - Support action serialization for complex operations
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 5.2 Implement history size limiting and boundary checks

    - Enforce maxSize limit
    - Clear redo history on new action
    - _Requirements: 4.6, 4.7_

  - [x] 5.3 Write property test for history recording

    - **Property 5: History Recording**
    - **Validates: Requirements 4.1**
  - [x] 5.4 Write property test for undo-redo round trip

    - **Property 6: Undo-Redo Round Trip**
    - **Validates: Requirements 4.2, 4.3**
  - [x] 5.5 Write property tests for boundary conditions

    - **Property 7: Undo Boundary**
    - **Property 8: Redo Boundary**
    - **Validates: Requirements 4.4, 4.5**
  - [x] 5.6 Write property test for new action clears redo

    - **Property 9: New Action Clears Redo History**
    - **Validates: Requirements 4.6**
  - [x] 5.7 Write property test for history size limit

    - **Property 10: History Size Limit**

    - **Validates: Requirements 4.7**



- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement KeyboardManager with shortcut system
  - [ ] 7.1 Enhance KeyboardManager with input focus detection
    - Detect when INPUT/TEXTAREA is focused
    - Skip shortcut handling during input
    - _Requirements: 5.8_
  - [x] 7.2 Register default shortcuts

    - Space: toggle auto-rotate
    - F: toggle fullscreen
    - H: toggle hotspots
    - Ctrl+S: save project
    - Ctrl+Z/Y: undo/redo
    - Delete: delete selected
    - Arrow keys: navigate scenes
    - ?: show help panel
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.9_

  - [-] 7.3 Write property test for input focus ignores shortcuts


    - **Property 11: Input Focus Ignores Shortcuts**

    - **Validates: Requirements 5.8**
  - [x] 7.4 Write unit tests for keyboard shortcuts





    - Test shortcut registration
    - Test modifier key combinations
    - _Requirements: 5.1-5.9_


- [ ] 8. Implement SceneManager with memory optimization
  - [x] 8.1 Create SceneManager class

    - Implement scene creation, switching, deletion
    - Track loaded/unloaded state
    - _Requirements: 2.1, 2.2_

  - [ ] 8.2 Implement scene unloading mechanism
    - Unload inactive scenes when threshold exceeded
    - Reload scenes on demand

    - _Requirements: 2.1, 2.2_
  - [ ] 8.3 Implement resource cleanup on delete
    - Remove scene from cache
    - Release texture resources
    - _Requirements: 2.5_
  - [x] 8.4 Write property test for scene unloading threshold


    - **Property 2: Scene Unloading Threshold**
    - **Validates: Requirements 2.1**
  - [x] 8.5 Write property test for scene reload on switch

    - **Property 3: Scene Reload on Switch**
    - **Validates: Requirements 2.2**
  - [x] 8.6 Write property test for resource cleanup

    - **Property 4: Resource Cleanup on Delete**
    - **Validates: Requirements 2.5**



- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [x] 10. Enhance PerformanceMonitor with load time recording


  - [-] 10.1 Integrate load time recording with ImageLoader






    - Record load time for each image
    - Expose load time in performance report
    - _Requirements: 8.4_

  - [ ] 10.2 Write property test for load time recording



    - **Property 12: Load Time Recording**
    - **Validates: Requirements 8.4**

- [x] 11. Implement mobile responsive layout

  - [x] 11.1 Create responsive CSS for mobile breakpoints

    - Single column layout for screens < 768px
    - Drawer-style side panel
    - Bottom toolbar
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 11.2 Implement orientation change handling

    - Detect orientation changes
    - Adjust layout accordingly
    - _Requirements: 6.4_
  - [x] 11.3 Increase touch target sizes for mobile

    - Ensure buttons are at least 44x44 pixels

    - Add appropriate padding
    - _Requirements: 6.5_

- [x] 12. Implement touch gesture optimizations

  - [x] 12.1 Enhance single-finger drag for rotation

    - Smooth rotation with touch
    - _Requirements: 7.1_
  - [x] 12.2 Implement pinch-to-zoom gesture

    - Two-finger zoom control
    - _Requirements: 7.2_
  - [x] 12.3 Implement double-tap zoom and long-press menu

    - Double-tap to zoom in/reset
    - Long-press on hotspot for menu
    - _Requirements: 7.3, 7.4_
  - [-] 12.4 Implement inertia scrolling


    - Apply momentum after swipe
    - _Requirements: 7.5_

- [ ] 13. Integrate modules into main application
  - [x] 13.1 Refactor app-v2.js to use new modules

    - Import and initialize all modules
    - Replace inline code with module calls
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 13.2 Wire up EventBus for module communication
    - Connect scene events
    - Connect history events
    - Connect keyboard events
    - _Requirements: 3.3_

  - [ ] 13.3 Update UI to reflect module state changes
    - Update undo/redo button states
    - Update scene list on changes
    - _Requirements: 4.4, 4.5_


- [x] 14. Final Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement EXRDecoder for HDR image support
  - [ ] 15.1 Create EXRDecoder class with file detection

    - Implement isEXRFile() to detect .exr extension
    - Load Three.js EXRLoader library
    - _Requirements: 9.1_

  - [ ] 15.2 Implement EXR decoding with progress tracking

    - Decode EXR to Float32 texture
    - Emit progress events for each stage (读取、解析、转换、完成)
    - _Requirements: 9.1, 9.2_

  - [ ] 15.3 Implement ACES Filmic tone mapping

    - Create WebGL shader for ACES tone mapping
    - Render HDR texture to Canvas with tone mapping
    - Convert to JPEG DataURL
    - _Requirements: 9.3_

  - [ ] 15.4 Implement exposure adjustment

    - Add adjustExposure() method
    - Re-apply tone mapping with new exposure value
    - Update scene exposure property
    - _Requirements: 9.4_

  - [ ] 15.5 Add file size validation and warnings

    - Check file size before decoding
    - Show warning dialog for files > 20MB
    - _Requirements: 9.5_

  - [ ] 15.6 Implement EXR error handling

    - Detect and categorize error types (file_too_large, unsupported_format, decode_failed, webgl_not_supported)
    - Throw errors with specific type field
    - _Requirements: 9.6_

  - [ ] 15.7 Extract and store EXR metadata

    - Parse width, height, channels, compression, dataType
    - Store in scene.exrMetadata
    - _Requirements: 9.7_

  - [ ] 15.8 Write property test for EXR auto-detection
    - **Property 13: EXR Auto-Detection and Decoding**
    - **Validates: Requirements 9.1**

  - [ ] 15.9 Write property test for decode progress stages
    - **Property 14: EXR Decode Progress Stages**
    - **Validates: Requirements 9.2**

  - [ ] 15.10 Write property test for ACES tone mapping

    - **Property 15: ACES Tone Mapping Application**
    - **Validates: Requirements 9.3**

  - [ ] 15.11 Write property test for exposure adjustment

    - **Property 16: Exposure Adjustment Updates Image**
    - **Validates: Requirements 9.4**

  - [ ] 15.12 Write property test for error type mapping
    - **Property 17: EXR Error Type Mapping**
    - **Validates: Requirements 9.6**

  - [ ] 15.13 Write property test for HDR metadata display
    - **Property 18: HDR Scene Metadata Display**
    - **Validates: Requirements 9.7**

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement UILayoutManager for 720yun-style layout
  - [ ] 17.1 Create UILayoutManager class
    - Implement panel show/hide/toggle methods
    - Implement panel resize with constraints
    - _Requirements: 10.1_

  - [ ] 17.2 Implement layout persistence
    - Save layout preferences to localStorage
    - Load layout on app initialization
    - Implement resetLayout() for defaults
    - _Requirements: 10.5_

  - [ ] 17.3 Implement responsive layout handling
    - Detect screen width breakpoints (1024px, 768px)
    - Auto-collapse panels on small screens
    - Handle orientation changes
    - _Requirements: 10.6_

  - [ ] 17.4 Create Minimap component
    - Render scene nodes with thumbnails
    - Draw connection lines between linked scenes
    - Highlight current scene
    - Implement click-to-navigate
    - _Requirements: 10.7_

  - [ ] 17.5 Write property test for layout preferences round trip
    - **Property 22: Layout Preferences Round Trip**
    - **Validates: Requirements 10.5**

  - [ ] 17.6 Write property test for minimap toggle
    - **Property 23: Minimap Toggle Behavior**
    - **Validates: Requirements 10.7**

- [ ] 18. Build UI components for 720yun-style interface
  - [ ] 18.1 Create Toolbar component
    - Add buttons: 添加场景, 添加热点, 设置, 导出, 撤销, 重做, 帮助
    - Wire up event handlers
    - Add tooltips with keyboard shortcuts
    - _Requirements: 10.1, 10.4, 10.8_

  - [ ] 18.2 Create Scene List panel
    - Display scene thumbnails in vertical list
    - Highlight selected scene
    - Add "+" button for new scenes
    - Implement click-to-switch
    - _Requirements: 10.1, 10.2_

  - [ ] 18.3 Create Properties Panel component
    - Create forms for scene properties (name, type, exposure for HDR)
    - Create forms for hotspot properties (position, type, content, style)
    - Create forms for project settings
    - Implement property change callbacks
    - _Requirements: 10.1, 10.3_

  - [ ] 18.4 Add HDR-specific UI elements
    - Add HDR badge to scene thumbnails
    - Add exposure slider for HDR scenes
    - Display EXR metadata in properties panel
    - _Requirements: 9.4, 9.7_

  - [ ] 18.5 Write property test for scene selection highlight
    - **Property 19: Scene Selection Highlights Active**
    - **Validates: Requirements 10.2**

  - [ ] 18.6 Write property test for properties panel data
    - **Property 20: Properties Panel Shows Hotspot Data**
    - **Validates: Requirements 10.3**

  - [ ] 18.7 Write property test for toolbar button actions
    - **Property 21: Toolbar Button Action Mapping**
    - **Validates: Requirements 10.4**

  - [ ] 18.8 Write property test for toolbar tooltips
    - **Property 24: Toolbar Tooltip Display**
    - **Validates: Requirements 10.8**

- [ ] 19. Integrate EXR support into ImageLoader
  - [ ] 19.1 Update ImageLoader to detect and route EXR files
    - Check file extension in loadProgressive()
    - Route .exr files to EXRDecoder
    - Route other formats to existing logic
    - _Requirements: 9.1_

  - [ ] 19.2 Update SceneManager to handle HDR scenes
    - Set isHDR flag when creating scenes from EXR
    - Store exposure value in scene data
    - Store EXR metadata in scene data
    - _Requirements: 9.1, 9.4, 9.7_

  - [ ] 19.3 Wire up exposure adjustment to UI
    - Connect exposure slider to EXRDecoder.adjustExposure()
    - Update scene when exposure changes
    - Emit events for UI updates
    - _Requirements: 9.4_

- [ ] 20. Apply 720yun-style CSS and layout
  - [ ] 20.1 Create layout CSS structure
    - Four-region grid layout (toolbar, left, center, right)
    - Resizable panel dividers
    - Responsive breakpoints
    - _Requirements: 10.1, 10.6_

  - [ ] 20.2 Style toolbar and buttons
    - Icon buttons with hover effects
    - Tooltip positioning
    - Active state indicators
    - _Requirements: 10.4, 10.8_

  - [ ] 20.3 Style scene list panel
    - Thumbnail grid with labels
    - Selected state highlighting
    - Hover effects
    - _Requirements: 10.2_

  - [ ] 20.4 Style properties panel
    - Form layouts for different property types
    - Collapsible sections
    - HDR-specific controls (exposure slider)
    - _Requirements: 10.3, 9.4_

  - [ ] 20.5 Style minimap component
    - Floating overlay in bottom-right
    - Node and connection styling
    - Current scene highlight
    - _Requirements: 10.7_

- [ ] 21. Final integration and testing
  - [ ] 21.1 Integrate all UI components into main app
    - Initialize UILayoutManager
    - Mount all panel components
    - Wire up EventBus for component communication
    - _Requirements: 10.1_

  - [ ] 21.2 Test EXR workflow end-to-end
    - Upload EXR file
    - Verify progress display
    - Adjust exposure
    - Verify metadata display
    - _Requirements: 9.1-9.7_

  - [ ] 21.3 Test UI layout responsiveness
    - Test desktop layout (≥1024px)
    - Test tablet layout (768-1023px)
    - Test mobile layout (<768px)
    - Test panel resizing and persistence
    - _Requirements: 10.1-10.8_

- [ ] 22. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

