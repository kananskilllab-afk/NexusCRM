import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, FiBell, FiPlus, FiUser, FiLogOut, FiMenu 
} from 'react-icons/fi';
import { useLeads } from '../context/LeadContext';
import './TopNav.css';

const TopNav = ({ toggleMobileMenu }) => {
  const { state, dispatch } = useLeads();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogoutClick = (e) => {
    e.stopPropagation();
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

  return (
    <header className="top-nav-utility">
      <div className="nav-left-section">
        <button className="mobile-toggle-btn" onClick={toggleMobileMenu}>
          <FiMenu />
        </button>
        <div className="search-box-minimal">
           <FiSearch />
           <input type="text" placeholder="Search leads..." />
        </div>
      </div>

      <div className="nav-right-section">
         <div className="notif-icon-btn">
            <FiBell />
            <span className="dot"></span>
         </div>
         <div 
           className="user-profile-utility" 
           onClick={handleProfileClick} 
           title="Click to View Profile"
           style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
         >
            {state.currentUser?.profile_image ? (
              <img 
                src={state.currentUser.profile_image} 
                alt="Avatar" 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  marginRight: '10px', 
                  border: '1px solid var(--border-color)' 
                }} 
              />
            ) : state.currentUser?.signature_fields?.logo ? (
              <img 
                src={state.currentUser.signature_fields.logo} 
                alt="Avatar" 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  marginRight: '10px', 
                  border: '1px solid var(--border-color)' 
                }} 
              />
            ) : (
              <div className="avatar-letter">{state.currentUser?.name?.charAt(0)}</div>
            )}
            <div className="user-meta">
               <span className="uname">{state.currentUser?.name}</span>
               <span className="urole">{state.currentUser?.role}</span>
            </div>
            <button 
              onClick={handleLogoutClick} 
              title="Logout" 
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                padding: '6px',
                marginLeft: '10px',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <FiLogOut />
            </button>
         </div>
      </div>
    </header>
  );
};

export default TopNav;
