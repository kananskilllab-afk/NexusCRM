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

  const handleLogout = () => {
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
         <div className="user-profile-utility" onClick={handleLogout} title="Click to Logout">
            <div className="avatar-letter">{state.currentUser?.name?.charAt(0)}</div>
            <div className="user-meta">
               <span className="uname">{state.currentUser?.name}</span>
               <span className="urole">{state.currentUser?.role}</span>
            </div>
            <FiLogOut />
         </div>
      </div>
    </header>
  );
};

export default TopNav;
