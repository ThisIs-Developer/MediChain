"use strict";
$("#modeSwitcher").on("click", function (e) {
  e.preventDefault(), modeSwitch(), location.reload();
}),
  $(".collapseSidebar").on("click", function (e) {
    $(".vertical").hasClass("narrow")
      ? $(".vertical").toggleClass("open")
      : ($(".vertical").toggleClass("collapsed"),
        $(".vertical").hasClass("hover") &&
        $(".vertical").removeClass("hover")),
      e.preventDefault();
  }),
  $(".sidebar-left").hover(
    function () {
      $(".vertical").hasClass("collapsed") && $(".vertical").addClass("hover"),
        $(".narrow").hasClass("open") || $(".vertical").addClass("hover");
    },
    function () {
      $(".vertical").hasClass("collapsed") &&
        $(".vertical").removeClass("hover"),
        $(".narrow").hasClass("open") || $(".vertical").removeClass("hover");
    }
  ),
  $(".toggle-sidebar").on("click", function () {
    $(".navbar-slide").toggleClass("show");
  }),
  (function (a) {
    a(".dropdown-menu a.dropdown-toggle").on("click", function (e) {
      return (
        a(this).next().hasClass("show") ||
        a(this)
          .parents(".dropdown-menu")
          .first()
          .find(".show")
          .removeClass("show"),
        a(this).next(".dropdown-menu").toggleClass("show"),
        a(this)
          .parents("li.nav-item.dropdown.show")
          .on("hidden.bs.dropdown", function (e) {
            a(".dropdown-submenu .show").removeClass("show");
          }),
        !1
      );
    });
  })(jQuery),
  $(".navbar .dropdown").on("hidden.bs.dropdown", function () {
    $(this).find("li.dropdown").removeClass("show open"),
      $(this).find("ul.dropdown-menu").removeClass("show open");
  })