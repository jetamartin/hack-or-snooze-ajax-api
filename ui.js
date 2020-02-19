$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navSubmit = $("#nav-submit");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");

  const $mainNavLink = $('.main-nav-links')
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");
  const $navFavorites = $('#nav-favorites');
  const $navMyStories = $('#nav-my-stories');
  const $favoritedArticlesList = $('#favorited-articles');
  const $userProfile = $('#user-profile');
 

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /** Show user Profile when user clicks on their user name in nav bar 
   *   - Show profile
   *   - Hide list of stories
   */

  $navUserProfile.on("click", function() {
    // hide everything
    hideElements();
    // except the user profile
    $userProfile.show();
  });

 
   /**
   * Event Handler for Navigation Submit
   */

  $navSubmit.on("click", function() {
    if (currentUser) {
      hideElements();
      $allStoriesList.show();
      $submitForm.slideToggle();
    }
  });

  /** Event Listener for nav option to view only favorited stories 
   *   -- User must be logged in to get this view
   */
  $navFavorites.on('click', function (evt){
    hideElements();
    if (currentUser) {
      displayFavoritesList();
      $favoritedArticlesList.show();
    }
  });

  /** Event Listener for nav option to view only stories created by logged in user
   *  -- User must be logged in to get this view
   */

  $navMyStories.on('click', function (evt) {
    hideElements();
    if (currentUser) {
      displayMyArticlesList();
      $ownStories.show();
    }
  });

 
  /** Event listener for nav bar to submit a new story via (#submit-form)
   *  if user is logged in (user! = null)
   * 
   * 
   */
  $submitForm.on("submit", async function(evt) {
    evt.preventDefault();
    if (currentUser) {  //check if user is logged in
      // author title url
      const newStory = {
        author  : $('#author').val(),
        title   : $('#title').val(),
        url     : $('#url').val() 
      };
      try {
        const newStoryInstance = await storyList.addStory(currentUser, newStory);
        // generate markup for the new story
        // Mentor: The solution guide includes the following line...don't think it's right
        // <li id="${storyObject.storyId}" class="id-${storyObject.storyId}">
        const $li = $(`
          <li id="${newStoryInstance.storyId}">
            <span class="star">
              <i class="far fa-star"></i>
            </span>
            <a class="article-link" href="${newStory.url}" target="a_blank">
              <strong>${newStory.title}</strong>
            </a>
            <small class="article-author">by ${newStory.author}</small>
            <small class="article-hostname">(${getHostName(newStory.url)})</small>
            <small class="article-username">posted by ${newStory.author}</small>
          </li>
        `);
        // Add the new story to the UI
        $allStoriesList.prepend($li);

        // hide the form and reset it
        $submitForm.slideUp("slow");
        $submitForm.trigger("reset");

      } catch (error) {
        console.log("Could not create a new story. See error message: ", error);
      }
    } else {
      console.log("User must be logged in to submit story");
    }
  })


  /**
   * Event listener for logging in.
  
   *  
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });



  /** Favoriting Event Handler
   *  
   */
  $(".articles-container").on('click', ".star", async function(evt) {
    const $starElem = $(evt.target);
    const $story = $(evt.target).closest("li"); 
    const storyId = $story.attr('id');

    if ($starElem.hasClass('far')) {  // Not favorited so add favorite

      await currentUser.addFavorite(storyId);
      $starElem.toggleClass('fas far');

    } else {  // Already favorited so remove favorite

     await currentUser.removeFavorite(storyId);
      $starElem.toggleClass('fas far');

    }
    
  });

  /** Event listener for User to delete their own stories
   * 
   */
  $ownStories.on('click', ".trash-can", async function(evt) {
    if (currentUser) {
      const trashElem = evt.target;
      const $story = $(evt.target.closest("li"));
      const storyId = $story.attr('id');
      currentUser = await storyList.deleteStory(currentUser, storyId);

          // re-generate the story list
      await generateStories();

      // hide everything
      hideElements();

      // ...except the story list
      $allStoriesList.show();

      // $myArticlesList.empty();
      // displayMyArticlesList();
    }
  });


  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      generateProfile();
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();

    // get the user profile
    generateProfile();
  }

  /**
   * Build a user profile based on the global "user" instance
   */

  function generateProfile() {
    // show your name
    $("#profile-name").text(`Name: ${currentUser.name}`);
    // show your username
    $("#profile-username").text(`Username: ${currentUser.username}`);
    // format and display the account creation date
    $("#profile-account-date").text(
      `Account Created: ${currentUser.createdAt.slice(0, 10)}`
    );
    // set the navigation to list the username
    $navUserProfile.text(`${currentUser.username}`);
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story, false);
      $allStoriesList.append(result);
    }
  }

  
  /**
   * Determine if the story is a user's favorite
   * 
   */
   function storyIsFavorite(story) {
     if (currentUser) {
      let favoriteIds = currentUser.favorites.map(story => story.storyId); 
      return favoriteIds.includes(story.storyId);
     }
 
   }
  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story, isOwnStory) {
    let hostName = getHostName(story.url);

    let trashCan = isOwnStory ? '<span class="trash-can"><i class="far fa-trash-alt"></i></span>' : "";

    // If it is a favorit then star type will be 
    let starType = "far fa-star";
    if (storyIsFavorite(story) ) {
      starType = "fas fa-star"
    }

    // render story markup
    const storyMarkup = $(`
       <li id="${story.storyId}">
       ${trashCan}
        <span class="star">
          <i class="${starType}"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $favoritedArticlesList,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $mainNavLink.show();
    $userProfile.hide();
    $navLogin.hide();
    $navWelcome.show();
    $navUserProfile.text(currentUser.username);
    $navLogOut.show();
  }

  function displayFavoritesList() {
    $favoritedArticlesList.empty();
    // if the user has no favorites
    if (currentUser.favorites.length === 0) {
      $favoritedArticlesList.append("<h5>No favorites added!</h5>");
    } else {  // the user has at least one favorite article
      // loop through all of favorite stories and generate HTML for them
      for (let story of currentUser.favorites) {
        const result = generateStoryHTML(story, false);
        $favoritedArticlesList.append(result);
      }
    }
  }

  function displayMyArticlesList() {
    $ownStories.empty();

    // if the user has no stories that they have posted
    if (currentUser.ownStories.length === 0) {
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    } else {
      // for all of the user's posted stories
      for (let story of currentUser.ownStories) {
        // render each story in the list
        let res = generateStoryHTML(story, true);
        $ownStories.append(res);
      }
    }

    $ownStories.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
