import { useMemo, useState } from "react";
import fixtures from "./data/fixtures.json";
import "./App.css";

type Fixture = {
  id: string;
  start: string;
  timezone: string;
  venue: string;
  zone: string;
  field: number;
  category: string;
  pool: string;
  team1: string;
  team2: string;
  fixture: string;
  status: string;
};

type FollowedSelection = {
  team: string;
  category: string;
};

type View = "fixtures" | "my-fixtures";

const TOURNAMENT_TIMEZONE = "Australia/Sydney";

function getStoredSelections(): FollowedSelection[] {
  try {
    const stored = localStorage.getItem("followedSelections");

    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getStoredFixtureIds(): string[] {
  try {
    const stored = localStorage.getItem("savedFixtureIds");

    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function App() {
  const browserTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [view, setView] = useState<View>("fixtures");

  const [selectedTeam, setSelectedTeam] = useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("");

  const [selectedTimezone, setSelectedTimezone] =
    useState(
      localStorage.getItem("preferredTimezone") ||
        browserTimezone
    );

  const [followedSelections, setFollowedSelections] =
    useState<FollowedSelection[]>(getStoredSelections);

  const [savedFixtureIds, setSavedFixtureIds] =
    useState<string[]>(getStoredFixtureIds);

  /*
   * Build a unique list of teams
   */
  const teams = useMemo(() => {
    const allTeams = fixtures.flatMap((fixture: Fixture) => [
      fixture.team1,
      fixture.team2,
    ]);

    return [...new Set(allTeams)]
      .filter(Boolean)
      .sort();
  }, []);

  /*
   * Only show categories that contain
   * the currently selected team
   */
  const categories = useMemo(() => {
    if (!selectedTeam) return [];

    return [
      ...new Set(
        fixtures
          .filter(
            (fixture: Fixture) =>
              fixture.team1 === selectedTeam ||
              fixture.team2 === selectedTeam
          )
          .map((fixture: Fixture) => fixture.category)
      ),
    ].sort();
  }, [selectedTeam]);

  /*
   * Fixtures shown on the main fixture finder
   */
  const filteredFixtures = useMemo(() => {
    return fixtures
      .filter((fixture: Fixture) => {
        const matchesTeam =
          !selectedTeam ||
          fixture.team1 === selectedTeam ||
          fixture.team2 === selectedTeam;

        const matchesCategory =
          !selectedCategory ||
          fixture.category === selectedCategory;

        return matchesTeam && matchesCategory;
      })
      .filter(
        (fixture: Fixture) =>
          fixture.team1 || fixture.team2
      )
      .sort(
        (a: Fixture, b: Fixture) =>
          new Date(a.start).getTime() -
          new Date(b.start).getTime()
      );
  }, [selectedTeam, selectedCategory]);

  /*
   * Build My Fixtures from:
   *
   * 1. Followed team/category combinations
   * 2. Individually saved fixtures
   *
   * A fixture only appears once even if
   * it qualifies through both.
   */
  const myFixtures = useMemo(() => {
    return fixtures
      .filter((fixture: Fixture) => {
        const individuallySaved =
          savedFixtureIds.includes(fixture.id);

        const includedByFollow =
          followedSelections.some(
            (selection) =>
              selection.category === fixture.category &&
              (fixture.team1 === selection.team ||
                fixture.team2 === selection.team)
          );

        return individuallySaved || includedByFollow;
      })
      .filter(
        (fixture: Fixture) =>
          fixture.team1 || fixture.team2
      )
      .sort(
        (a: Fixture, b: Fixture) =>
          new Date(a.start).getTime() -
          new Date(b.start).getTime()
      );
  }, [followedSelections, savedFixtureIds]);

  const currentSelectionIsFollowed =
    Boolean(selectedTeam) &&
    Boolean(selectedCategory) &&
    followedSelections.some(
      (selection) =>
        selection.team === selectedTeam &&
        selection.category === selectedCategory
    );

  /*
   * Follow / unfollow a whole team-category
   */
  const toggleFollowSelection = () => {
    if (!selectedTeam || !selectedCategory) return;

    let updatedSelections: FollowedSelection[];

    if (currentSelectionIsFollowed) {
      updatedSelections = followedSelections.filter(
        (selection) =>
          !(
            selection.team === selectedTeam &&
            selection.category === selectedCategory
          )
      );
    } else {
      updatedSelections = [
        ...followedSelections,
        {
          team: selectedTeam,
          category: selectedCategory,
        },
      ];
    }

    setFollowedSelections(updatedSelections);

    localStorage.setItem(
      "followedSelections",
      JSON.stringify(updatedSelections)
    );
  };

  /*
   * Save / unsave an individual fixture
   */
  const toggleSaveFixture = (fixtureId: string) => {
    const alreadySaved =
      savedFixtureIds.includes(fixtureId);

    const updatedIds = alreadySaved
      ? savedFixtureIds.filter(
          (id) => id !== fixtureId
        )
      : [...savedFixtureIds, fixtureId];

    setSavedFixtureIds(updatedIds);

    localStorage.setItem(
      "savedFixtureIds",
      JSON.stringify(updatedIds)
    );
  };

  /*
   * Remove a followed team/category
   * from My Fixtures
   */
  const removeFollow = (
    team: string,
    category: string
  ) => {
    const updated = followedSelections.filter(
      (selection) =>
        !(
          selection.team === team &&
          selection.category === category
        )
    );

    setFollowedSelections(updated);

    localStorage.setItem(
      "followedSelections",
      JSON.stringify(updated)
    );
  };

  /*
   * Timezone preference
   */
  const changeTimezone = (timezone: string) => {
    setSelectedTimezone(timezone);

    localStorage.setItem(
      "preferredTimezone",
      timezone
    );
  };

  const formatFixtureDate = (
    date: string,
    timezone: string
  ) => {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: timezone,
    }).format(new Date(date));
  };

  const formatFixtureTime = (
    date: string,
    timezone: string
  ) => {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date(date));
  };

  const formatTournamentTime = (date: string) => {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TOURNAMENT_TIMEZONE,
    }).format(new Date(date));
  };

  /*
   * Fixture card used on both pages
   */
  const renderFixtureCard = (fixture: Fixture) => {
    const saved =
      savedFixtureIds.includes(fixture.id);

    const highlightedTeam =
      selectedTeam ||
      followedSelections.find(
        (selection) =>
          selection.category === fixture.category &&
          (fixture.team1 === selection.team ||
            fixture.team2 === selection.team)
      )?.team ||
      "";

    return (
      <div
        className="fixture-card"
        key={fixture.id}
      >
        <div className="fixture-top">
          <div>
            <div className="fixture-date">
              {formatFixtureDate(
                fixture.start,
                selectedTimezone
              )}
            </div>

            <div className="fixture-time">
              {formatFixtureTime(
                fixture.start,
                selectedTimezone
              )}
            </div>

            {selectedTimezone !==
              TOURNAMENT_TIMEZONE && (
              <div className="tournament-time">
                Tournament time:{" "}
                {formatTournamentTime(
                  fixture.start
                )}
              </div>
            )}
          </div>

          <div className="field">
            Field {fixture.field}
          </div>
        </div>

        <div className="category">
          {fixture.category}

          {fixture.pool &&
            ` · ${fixture.pool}`}
        </div>

        <div className="teams">
          <div
            className={
              fixture.team1 === highlightedTeam
                ? "selected-team"
                : ""
            }
          >
            {fixture.team1 || "TBC"}
          </div>

          <div className="versus">
            vs
          </div>

          <div
            className={
              fixture.team2 === highlightedTeam
                ? "selected-team"
                : ""
            }
          >
            {fixture.team2 || "TBC"}
          </div>
        </div>

        <div className="location">
          {fixture.zone && (
            <span>{fixture.zone}</span>
          )}

          {fixture.zone &&
            fixture.venue && (
              <span className="location-dot">
                •
              </span>
            )}

          {fixture.venue && (
            <span>{fixture.venue}</span>
          )}
        </div>

        <div className="fixture-actions">
          <button
            className={
              saved
                ? "save-button saved"
                : "save-button"
            }
            onClick={() =>
              toggleSaveFixture(fixture.id)
            }
          >
            {saved
              ? "★ Saved"
              : "☆ Save fixture"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app">

      {/* HERO */}

      <header className="site-header">
        <div className="eyebrow">
          2026 ITF WORLD CUP
        </div>

        <h1>Fixture Finder</h1>

        <p>
          Find, save and follow the matches you
          care about.
        </p>
      </header>

      {/* MAIN NAV */}

      <nav className="navigation">
        <button
          className={
            view === "fixtures"
              ? "nav-button active"
              : "nav-button"
          }
          onClick={() =>
            setView("fixtures")
          }
        >
          Fixtures
        </button>

        <button
          className={
            view === "my-fixtures"
              ? "nav-button active"
              : "nav-button"
          }
          onClick={() =>
            setView("my-fixtures")
          }
        >
          My Fixtures

          {myFixtures.length > 0 && (
            <span className="nav-count">
              {myFixtures.length}
            </span>
          )}
        </button>
      </nav>

      {/* TIMEZONE */}

      <div className="timezone-bar">
        <div className="timezone-label">
          <span className="timezone-title">
            Times shown in
          </span>

          <span className="timezone-help">
            Change this to view fixtures in
            another timezone
          </span>
        </div>

        <select
          value={selectedTimezone}
          onChange={(e) =>
            changeTimezone(e.target.value)
          }
        >
          <option value={browserTimezone}>
            Your local time ({browserTimezone})
          </option>

          <option value="Australia/Sydney">
            Tournament time – Coffs Harbour
          </option>

          <option value="Europe/London">
            London
          </option>

          <option value="Pacific/Auckland">
            Auckland
          </option>

          <option value="Pacific/Fiji">
            Fiji
          </option>

          <option value="Pacific/Apia">
            Samoa
          </option>

          <option value="America/New_York">
            New York
          </option>

          <option value="America/Los_Angeles">
            Los Angeles
          </option>
        </select>
      </div>

      {/* FIXTURE FINDER */}

      {view === "fixtures" && (
        <>
          <section className="filters">
            <div className="filter">
              <label>
                Team
              </label>

              <select
                value={selectedTeam}
                onChange={(e) => {
                  setSelectedTeam(
                    e.target.value
                  );

                  setSelectedCategory("");
                }}
              >
                <option value="">
                  Select a team
                </option>

                {teams.map((team) => (
                  <option
                    key={team}
                    value={team}
                  >
                    {team}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter">
              <label>
                Category
              </label>

              <select
                value={selectedCategory}
                disabled={!selectedTeam}
                onChange={(e) =>
                  setSelectedCategory(
                    e.target.value
                  )
                }
              >
                <option value="">
                  All categories
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>
            </div>
          </section>

          {selectedTeam &&
            selectedCategory && (
              <section className="follow-section">
                <div className="follow-info">
                  <span className="follow-label">
                    Selected team
                  </span>

                  <div>
                    <strong>
                      {selectedTeam}
                    </strong>

                    <span>
                      {" "}
                      · {selectedCategory}
                    </span>
                  </div>
                </div>

                <button
                  className={
                    currentSelectionIsFollowed
                      ? "follow-button following"
                      : "follow-button"
                  }
                  onClick={
                    toggleFollowSelection
                  }
                >
                  {currentSelectionIsFollowed
                    ? "✓ Following all fixtures"
                    : "+ Follow all fixtures"}
                </button>
              </section>
            )}

          <section className="fixtures">
            {!selectedTeam && (
              <div className="empty-state">
                <div className="empty-icon">
                  ⚡
                </div>

                <h3>
                  Find your fixtures
                </h3>

                <p>
                  Choose a team above to see
                  their World Cup schedule.
                </p>
              </div>
            )}

            {selectedTeam &&
              filteredFixtures.length === 0 && (
                <div className="empty-state">
                  <h3>
                    No fixtures found
                  </h3>

                  <p>
                    Try another team or category.
                  </p>
                </div>
              )}

            {selectedTeam &&
              filteredFixtures.map(
                renderFixtureCard
              )}
          </section>
        </>
      )}

      {/* MY FIXTURES */}

      {view === "my-fixtures" && (
        <>
          <section className="my-fixtures-header">
            <div>
              <div className="section-eyebrow">
                YOUR SCHEDULE
              </div>

              <h2>
                My Fixtures
              </h2>

              <p>
                Follow complete team schedules or
                save individual matches.
              </p>
            </div>
          </section>

          {followedSelections.length > 0 && (
            <section className="following-list">
              <div className="following-heading">
                <h3>
                  Following
                </h3>

                <span>
                  {followedSelections.length}
                </span>
              </div>

              {followedSelections.map(
                (selection) => (
                  <div
                    className="following-item"
                    key={`${selection.team}-${selection.category}`}
                  >
                    <div>
                      <strong>
                        {selection.team}
                      </strong>

                      <span>
                        {selection.category}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        removeFollow(
                          selection.team,
                          selection.category
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                )
              )}
            </section>
          )}

          <section className="fixtures">
            {myFixtures.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  ☆
                </div>

                <h3>
                  Your schedule is empty
                </h3>

                <p>
                  Follow a team and category or
                  save individual fixtures to
                  build your personalised
                  schedule.
                </p>

                <button
                  className="empty-action"
                  onClick={() =>
                    setView("fixtures")
                  }
                >
                  Find fixtures
                </button>
              </div>
            ) : (
              myFixtures.map(
                renderFixtureCard
              )
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default App;