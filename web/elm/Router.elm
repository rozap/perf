module Router exposing (..)

import UrlParser exposing (Parser, (</>), format, int, oneOf, s, string)
import Navigation
import String

type Page
  = SuitesPage
  | SuitePage Int

urlParser : Navigation.Location -> Result String Page
urlParser location =
  UrlParser.parse identity pageParser (String.dropLeft 1 location.hash)

pageParser : Parser (Page -> a) a
pageParser =
  oneOf
    [ format SuitePage  (s "suites" </> int)
    , format SuitesPage (s "suites")
    ]

pageToRoute : Page -> String
pageToRoute page =
  case page of
    SuitesPage -> "#suites"
    SuitePage id -> "#suites/" ++ (toString id)