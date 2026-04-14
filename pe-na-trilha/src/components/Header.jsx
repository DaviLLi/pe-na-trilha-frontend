import logo from "../assets/logo.png";

function Header() {
  return (
    <header className='header'>
      <img src={logo} alt='Logo do Pé na Trilha' />
      <div className='nome'>
        <h1>Pé na Trilha</h1>
      </div>
    </header>
  );
}

export default Header;
