const menuToggle = document.querySelector('#side-menu-toggle');
const mainHeaderNav = document.querySelector('.main-header__nav');
const mainHeaderItemList = document.querySelector('.main-header__item-list');


function menuToggleClickHandler() {
  // mainHeaderItemList.style.display = 'none'

  if(mainHeaderItemList.style.display == 'none'){
    mainHeaderItemList.style.display= 'block';
  }else{
    mainHeaderItemList.style.display= 'none';
  }
  // sideDrawer.classList.add('open');
}

menuToggle.addEventListener('click', menuToggleClickHandler);

