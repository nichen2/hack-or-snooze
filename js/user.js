"use strict";

// global to hold the User instance of the currently-logged-in user
let currentUser;

/******************************************************************************
 * User login/signup/login
 */

/** Handle login form submission. If login ok, sets up the user instance */

async function login(evt) {
  console.debug("login", evt);
  evt.preventDefault();

  // grab the username and password
  const username = $("#login-username").val();
  const password = $("#login-password").val();

  // User.login retrieves user info from API and returns User instance
  // which we'll make the globally-available, logged-in user.
  currentUser = await User.login(username, password);

  $loginForm.trigger("reset");

  saveUserCredentialsInLocalStorage();
  updateUIOnUserLogin();
}

$loginForm.on("submit", login);

/** Handle signup form submission. */

async function signup(evt) {
  console.debug("signup", evt);
  evt.preventDefault();

  const name = $("#signup-name").val();
  const username = $("#signup-username").val();
  const password = $("#signup-password").val();

  // User.signup retrieves user info from API and returns User instance
  // which we'll make the globally-available, logged-in user.
  currentUser = await User.signup(username, password, name);

  saveUserCredentialsInLocalStorage();
  updateUIOnUserLogin();

  $signupForm.trigger("reset");
}

$signupForm.on("submit", signup);

/** Handle click of logout button
 *
 * Remove their credentials from localStorage and refresh page
 */

function logout(evt) {
  console.debug("logout", evt);
  localStorage.clear();
  location.reload();
}

$navLogOut.on("click", logout);

/******************************************************************************
 * Storing/recalling previously-logged-in-user with localStorage
 */

/** If there are user credentials in local storage, use those to log in
 * that user. This is meant to be called on page load, just once.
 */

async function checkForRememberedUser() {
  console.debug("checkForRememberedUser");
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  if (!token || !username) return false;

  // try to log in with these credentials (will be null if login failed)
  currentUser = await User.loginViaStoredCredentials(token, username);
}

/** Sync current user information to localStorage.
 *
 * We store the username/token in localStorage so when the page is refreshed
 * (or the user revisits the site later), they will still be logged in.
 */

function saveUserCredentialsInLocalStorage() {
  console.debug("saveUserCredentialsInLocalStorage");
  if (currentUser) {
    localStorage.setItem("token", currentUser.loginToken);
    localStorage.setItem("username", currentUser.username);
  }
}

/******************************************************************************
 * General UI stuff about users
 */

/** When a user signs up or registers, we want to set up the UI for them:
 *
 * - show the stories list
 * - update nav bar options for logged-in user
 * - generate the user profile part of the page
 */

function updateUIOnUserLogin() {
  console.debug("updateUIOnUserLogin");

  $allStoriesList.show();

  updateNavOnLogin();
}

/** Allow users to favorite and unfavorite story posts*/

/** Store the ids of favorited stories here where we can show them seperately
  - as well as retain status of the story's button  */
let userFavorites = JSON.parse(localStorage.getItem("userFavorites")) || [];

async function clickToFavorite(evt) {
  evt.preventDefault();
  const storyId = evt.target.parentNode.id;
  await axios({
    url: `${BASE_URL}/users/${currentUser.username}/favorites/${storyId}`,
    method: "POST",
    data: {
      token: currentUser.loginToken,
    },
  });
  evt.target.innerText = "Remove Favorite";
  evt.target.classList.add("remove-button");

  // update userFavorites with new favorite story
  userFavorites.push(storyId);
  localStorage.setItem("userFavorites", JSON.stringify(userFavorites));
}

async function clickToRemoveFavorite(evt) {
  evt.preventDefault();
  const storyId = evt.target.parentNode.id;
  await axios({
    url: `${BASE_URL}/users/${currentUser.username}/favorites/${storyId}`,
    method: "DELETE",
    data: {
      token: currentUser.loginToken,
    },
  });
  evt.target.innerText = "Favorite";
  evt.target.classList.remove("remove-button");

  // update userFavorites by removing unfavorited story
  userFavorites = userFavorites.filter((id) => id !== storyId);
  localStorage.setItem("userFavorites", JSON.stringify(userFavorites));
}

/** Because of event delegation we had to set up event listeners for both the all-list
  - as well as the favorites list, but now we have the added functionality of removing 
  - favorites directly from the favorites tab
*/
$favoritesList.on("click", "#favorite", clickToFavorite);
$favoritesList.on("click", ".remove-button", clickToRemoveFavorite);
$allStoriesList.on("click", "#favorite", clickToFavorite);
$allStoriesList.on("click", ".remove-button", clickToRemoveFavorite);

/** After being able to properly save and unsave favorites as well as storing this list of
 * favorites in local storage we can keep the status of the favorite/unfavorite button
 * consistent in the browser even after the page refreshes
 */
function getButtonStatus(listElement) {
  listElement.find("li").each(function () {
    const storyId = $(this).attr("id");

    if (userFavorites.includes(storyId)) {
      $(this)
        .find("#favorite")
        .text("Remove Favorite")
        .addClass("remove-button");
    } else {
      $(this).find("#favorite").text("Favorite").removeClass("remove-button");
    }
  });
}

/** Allow the user to delete stories and update the DOM */
async function deleteStory(evt) {
  evt.preventDefault();
  const storyId = evt.target.parentNode.id;
  userFavorites = userFavorites.filter((id) => id !== storyId);
  try {
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "DELETE",
      data: {
        token: currentUser.loginToken,
      },
    });
    evt.target.parentNode.remove();
  } catch (err) {
    console.error(`Failed to delete story with ID: ${storyId}`);
  }
}

$favoritesList.on("click", "#delete", function () {
  console.error("Cannot delete story in favorites tab!");
});
$allStoriesList.on("click", "#delete", deleteStory);
