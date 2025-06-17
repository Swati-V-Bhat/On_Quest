// import FAQ from "./components/FAQ";
// import Footer from "./components/Footer";
// import Hero from "./components/Hero";
// import HowItWorks from "./components/HowItWorks";
// import First from "./components/Inputs/TripPlanner";
// import Mid from "./components/Mid";
// import Navbar from "./components/Navbar";
// import PhoneSection from "./components/PhoneSection";
// import Signup from "./components/Signup";
import Trip from "./pages/Trip";
import Feed from "./components/Feed/Index";
import MyProfile from "./components/My-Profile/Index";
import Quest from "./pages/Quest";
import PostQuest from "./components/QuestPopups/PostQuest";
import VisibleTo from "./components/QuestPopups/VisibleTo";
import AddLocation from "./components/QuestPopups/AddLocation";
import TagPeople from "./components/QuestPopups/TagPeople";
import AddTags from "./components/QuestPopups/AddTags";
import Home from "./pages/Home";
import QuestCreator from "./components/quest/QuestCreator";
// import 




const App = () => (
  
  <>
    {/* { (<MyProfile/>)? (<Feed/>):<Home/>}   */}
    {/*if Myprofile exists, i.e if user is logged in render feed , else render home-landing-page */}
    
  <QuestCreator/>
    
{/* <MyProfile/>  */}

    
    {/* QuestPopups---> */}
          {/* <PostQuest/> */}
          {/* <VisibleTo/> */}
          {/* <AddLocation/> */}
          {/* <TagPeople/> */}
          {/* <AddTags/> */}
  </>
);

export default App;

