# Story AUTH-001: Remove Business Selection from Login Page

## Story Title
Remove Business Registration Link from Login Page - Brownfield Fix

## User Story
**As a** user trying to log in,  
**I want** to see only login functionality without business registration prompts,  
**So that** I have a clear, focused login experience without being confused by business setup options that should happen after account creation.

## Story Context

**Existing System Integration:**
- **Integrates with**: Login page (`/apps/web/src/app/(auth)/login/page.tsx:249-261`)
- **Technology**: Next.js 14+ React component with Tailwind CSS
- **Follows pattern**: Existing auth UI patterns in the codebase
- **Touch points**: Login form component, auth flow navigation

## Problem Description
Currently the login page shows a "¿Tienes un negocio?" section with a "Registrar negocio" button. This creates confusion because:
- Business registration should happen AFTER user account creation
- The login page should focus only on authentication
- Users get confused about the proper registration flow

## Acceptance Criteria

### Functional Requirements
1. **Remove business section**: Remove "¿Tienes un negocio?" section and "Registrar negocio" button from login page (lines 242-262)
2. **Keep user registration**: Maintain existing user registration link ("¿No tienes cuenta? Regístrate aquí")
3. **Preserve login functionality**: All existing login functionality remains unchanged

### Integration Requirements
4. **Auth flow unchanged**: Existing login authentication flow continues to work unchanged
5. **Registration link works**: User registration link continues to redirect to `/register` correctly
6. **Business context intact**: Integration with auth context and business context logic maintains current behavior

### Quality Requirements
7. **Test coverage**: Change is covered by existing login page tests
8. **No regression**: No regression in existing authentication functionality verified
9. **UI consistency**: UI/UX remains consistent with other auth pages

## Technical Implementation

### Files to Modify
- **Primary**: `/apps/web/src/app/(auth)/login/page.tsx`
  - Remove lines 242-262 (business registration section)
  - Keep lines 135-139 (user registration link)

### Code Changes Required
```typescript
// REMOVE THIS SECTION (lines 242-262):
/*
<div className="mt-6">
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-300" />
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-2 bg-white text-gray-500">
        ¿Tienes un negocio?
      </span>
    </div>
  </div>

  <div className="mt-6">
    <a
      href="/register/business"
      className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Registrar negocio
    </a>
  </div>
</div>
*/
```

### Integration Approach
- Simple removal of JSX section without affecting component logic
- No changes to state management or event handlers
- Maintains existing styling and layout patterns

### Existing Pattern Reference
- Follow auth page layout patterns used in register page
- Maintain consistent spacing and styling with other auth forms

## Definition of Done
- [x] Business registration section removed from login page (lines 254-274)
- [x] All existing login functionality tested and working
- [x] User registration link functionality verified
- [x] Login page tests updated (removed obsolete business registration test)
- [x] No visual regression in login page layout
- [x] Manual testing confirms clean, focused login experience

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-20250514

### Tasks
- [x] Analyze current login page implementation
- [x] Remove business registration section (lines 254-274)
- [x] Verify user registration link remains functional
- [x] Update test file to remove obsolete business registration test
- [x] Run code quality checks (linting passed)
- [x] Manual verification via development server

### Completion Notes
**Implementation Summary:**
- Successfully removed the "¿Tienes un negocio?" section and "Registrar negocio" button from login page
- Maintained existing user registration link ("¿No tienes cuenta? Regístrate aquí")
- Updated test file to remove the obsolete test for business registration link
- All existing login functionality preserved
- Code passed ESLint validation
- Development server confirmed clean login page layout

**Files Modified:**
- `/apps/web/src/app/(auth)/login/page.tsx` - Removed business registration section (lines 254-274)
- `/apps/web/src/app/(auth)/login/page.test.tsx` - Removed obsolete business registration link test

**Quality Assurance:**
- ESLint: ✅ No warnings or errors
- Functionality: ✅ Login form, password reset, and user registration link all functional
- UI/UX: ✅ Clean, focused login experience without business setup confusion
- Testing: ✅ Removed obsolete test, existing functionality maintained

### Change Log
- **2025-08-16**: Removed business registration section from login page as specified in story requirements
- **2025-08-16**: Updated corresponding test file to maintain test coverage accuracy

### Status
Ready for Review

## Risk Assessment

**Primary Risk**: Accidentally breaking login functionality  
**Mitigation**: Only remove UI elements, no logic changes  
**Rollback**: Simple git revert of the removed section

## Testing Strategy
1. **Unit tests**: Verify login form component renders correctly
2. **Integration tests**: Test complete login flow functionality  
3. **Visual tests**: Confirm layout and styling are maintained
4. **Manual testing**: Test login with various user scenarios

## Estimated Effort
**Development**: 15 minutes  
**Testing**: 30 minutes  
**Total**: 45 minutes